"use client";

import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  abandonCustomerBakongPayment,
  BAKONG_POLL_MS,
  BAKONG_TIMEOUT_MS,
  createCustomerBakongIntent,
  pollCustomerBakongState,
  type BakongIntent,
} from "@/lib/bakong-client";
import { BakongBankPicker } from "@/components/payments/bakong-bank-picker";
import { useAuth } from "@/lib/auth-context";
import { canShowKhqrBankPicker } from "@/lib/khqr-bank-links";
import { notifyError, notifySuccess } from "@/lib/notify";

type BakongPaymentModalProps = {
  /** Customer order id returned by `POST /customer/orders`. */
  orderId: number | null;
  /** Order receipt number (`#1234567`) — shown above the QR for clarity. */
  receiptNumber?: string | null;
  /** Total in KHR — only used as a fallback if the intent response doesn't return its own amount. */
  totalKhrFallback?: number | null;
  /** Called when the customer dismisses without paying. */
  onClose: () => void;
  /** Called when the poll detects a successful payment. */
  onPaid?: () => void;
};

function formatQrAmount(intent: BakongIntent | null): string {
  if (!intent) return "";
  if (intent.qr_currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(intent.qr_amount);
  }
  return `${new Intl.NumberFormat("en-US").format(Math.round(intent.qr_amount))} KHR`;
}

function formatCountdown(msRemaining: number): string {
  const safe = Math.max(0, Math.floor(msRemaining / 1000));
  const m = Math.floor(safe / 60).toString().padStart(2, "0");
  const s = (safe % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Modal that drives a customer-side Bakong KHQR payment. Reused by the menu (right after
 * "Place order") and by the order detail page. Mirrors the POS web-v1 cashier flow:
 * 1. Create an intent via POST /customer/payments/bakong/intent.
 * 2. Render the QR (qrcode.react).
 * 3. Poll GET /customer/payments/bakong/order/:id/payment-state every 3s.
 * 4. On `paid`, fire onPaid + close. On `cancelled`, error + close. On 10-min timeout, surface
 *    a "Generate new QR" CTA so the customer doesn't have to leave to retry.
 */
export function BakongPaymentModal({
  orderId,
  receiptNumber,
  totalKhrFallback,
  onClose,
  onPaid,
}: BakongPaymentModalProps) {
  const { token } = useAuth();
  const [intent, setIntent] = useState<BakongIntent | null>(null);
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [msRemaining, setMsRemaining] = useState<number>(BAKONG_TIMEOUT_MS);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAllTimers = useCallback(() => {
    if (pollTimerRef.current != null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (countdownTimerRef.current != null) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (oid: number) => {
      if (!token) return;
      clearAllTimers();
      setWaiting(true);
      setTimedOut(false);

      // 10-minute hard ceiling — matches QR expiry on the server.
      const deadline = Date.now() + BAKONG_TIMEOUT_MS;
      setMsRemaining(BAKONG_TIMEOUT_MS);
      countdownTimerRef.current = setInterval(() => {
        setMsRemaining(deadline - Date.now());
      }, 1000);

      timeoutRef.current = setTimeout(() => {
        clearAllTimers();
        setWaiting(false);
        setTimedOut(true);
      }, BAKONG_TIMEOUT_MS);

      const tick = async () => {
        const outcome = await pollCustomerBakongState(token, oid);
        if (outcome === "paid") {
          clearAllTimers();
          setWaiting(false);
          notifySuccess("Payment received. Thank you!");
          onPaid?.();
          onClose();
        } else if (outcome === "cancelled") {
          clearAllTimers();
          setWaiting(false);
          setError("This order was cancelled.");
        } else if (outcome === "expired") {
          clearAllTimers();
          setWaiting(false);
          setTimedOut(true);
          setIntent(null);
        }
      };

      void tick();
      pollTimerRef.current = setInterval(() => void tick(), BAKONG_POLL_MS);
    },
    [token, clearAllTimers, onPaid, onClose],
  );

  const requestIntent = useCallback(async () => {
    if (!token || !orderId) return;
    setLoading(true);
    setError(null);
    setTimedOut(false);
    try {
      if (timedOut) {
        await abandonCustomerBakongPayment(token, orderId);
      }
      const data = await createCustomerBakongIntent(token, orderId);
      setIntent(data);
      startPolling(orderId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not generate KHQR.";
      setError(msg);
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  }, [token, orderId, startPolling, timedOut]);

  const dismiss = useCallback(async () => {
    if (token && orderId && intent) {
      try {
        await abandonCustomerBakongPayment(token, orderId);
      } catch {
        /* best-effort — still close */
      }
    }
    clearAllTimers();
    onClose();
  }, [token, orderId, intent, clearAllTimers, onClose]);

  useEffect(() => {
    if (orderId == null) return;
    const t = setTimeout(() => void requestIntent(), 0);
    return () => {
      clearTimeout(t);
      clearAllTimers();
    };
  }, [orderId, requestIntent, clearAllTimers]);

  useEffect(() => {
    if (orderId == null) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [orderId]);

  if (orderId == null) return null;

  const amount = formatQrAmount(intent);
  const showFallbackAmount = !amount && totalKhrFallback != null;
  const fallbackAmountText = showFallbackAmount
    ? `${new Intl.NumberFormat("en-US").format(Math.round(totalKhrFallback as number))} KHR`
    : "";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Pay with Bakong KHQR"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--text)_62%,transparent)] backdrop-blur-md"
        onClick={() => void dismiss()}
        aria-label="Close payment"
      />
      <div className="relative z-10 max-h-[min(100dvh,100svh)] w-full max-w-md overflow-y-auto sm:max-h-[90vh]">
        <div className="brand-card overflow-hidden rounded-t-[2rem] shadow-2xl sm:rounded-[2rem]">
          <div className="relative overflow-hidden border-b border-white/10 bg-[var(--text)] px-4 py-5 text-white sm:px-8 sm:py-6">
            <button
              type="button"
              onClick={() => void dismiss()}
              className="absolute right-3 top-3 rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <span className="sr-only">Close</span>
              <CloseIcon />
            </button>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
              Bakong KHQR
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              {receiptNumber ? `Pay order #${receiptNumber}` : "Pay this order"}
            </h2>
            <p className="mt-1 text-xs text-white/70">
              Scan the QR with Bakong or any KHQR app, or tap Pay with Bakong below. We detect payment automatically.
            </p>
          </div>

          <div className="px-6 pt-6 sm:px-8 sm:pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom),var(--tg-safe-area-inset-bottom,0px))] sm:pb-[max(2rem,env(safe-area-inset-bottom),var(--tg-safe-area-inset-bottom,0px))]">
            {loading && !intent ? (
              <div className="flex flex-col items-center justify-center py-12">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
                <p className="mt-4 text-sm text-[var(--text-muted)]">Generating KHQR…</p>
              </div>
            ) : error && !intent ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={() => void requestIntent()}
                  className="brand-secondary-button rounded-full px-5 py-2.5 text-sm font-bold"
                >
                  Try again
                </button>
              </div>
            ) : intent ? (
              <>
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-5">
                  <QRCodeSVG value={intent.qr} size={232} level="M" includeMargin={false} />
                  <p className="mt-1 text-center text-2xl font-bold tabular-nums text-[var(--text)]">
                    {amount || fallbackAmountText || ""}
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {intent.qr_currency === "USD" ? "USD" : "Cambodian Riel"}
                  </p>
                </div>

                <BakongBankPicker
                  className="mt-4"
                  intent={{
                    qr: intent.qr,
                    deeplink: intent.deeplink,
                    deeplink_full: intent.deeplink_full,
                  }}
                />

                <div className="mt-5 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {timedOut ? "QR expired" : waiting ? "Waiting for payment…" : "Status"}
                  </span>
                  <span className="font-mono text-sm font-semibold text-[var(--text)]">
                    {timedOut ? "00:00" : formatCountdown(msRemaining)}
                  </span>
                </div>

                {timedOut ? (
                  <>
                    <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
                      This QR is no longer valid. Generate a new one to pay, or close and pay later from your orders.
                    </p>
                    <button
                      type="button"
                      onClick={() => void requestIntent()}
                      className="brand-primary-button mt-4 w-full rounded-full px-4 py-3 text-sm font-bold"
                    >
                      Generate new QR
                    </button>
                  </>
                ) : (
                  <p className="mt-5 text-center text-xs leading-relaxed text-[var(--text-muted)]">
                    {canShowKhqrBankPicker()
                      ? "Tap Pay with Bakong below, or scan the QR with any KHQR app. We close this window once payment clears."
                      : "Open your banking app, choose Scan KHQR, and confirm the payment. We will close this window once it clears."}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void dismiss()}
                  className="brand-secondary-button mt-5 w-full rounded-full px-4 py-2.5 text-sm font-bold"
                >
                  Cancel
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
