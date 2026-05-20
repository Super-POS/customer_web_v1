"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BARAY_POLL_MS,
  BARAY_TIMEOUT_MS,
  createCustomerBarayIntent,
  pollCustomerBarayState,
  type BarayIntent,
} from "@/lib/baray-client";
import { useAuth } from "@/lib/auth-context";
import { formatUsdFromKhr } from "@/lib/api";
import { useExchangeRate } from "@/contexts/exchange-rate-context";
import { notifyError, notifySuccess } from "@/lib/notify";
import { telegramOpenExternalLink } from "@/lib/telegram-webapp";

type BarayPaymentModalProps = {
  orderId: number | null;
  receiptNumber?: string | null;
  totalKhrFallback?: number | null;
  onClose: () => void;
  onPaid?: () => void;
};

function formatCountdown(msRemaining: number): string {
  const safe = Math.max(0, Math.floor(msRemaining / 1000));
  const m = Math.floor(safe / 60).toString().padStart(2, "0");
  const s = (safe % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * Customer Baray checkout: create pay link, open Baray, poll until the webhook settles payment.
 */
export function BarayPaymentModal({
  orderId,
  receiptNumber,
  totalKhrFallback,
  onClose,
  onPaid,
}: BarayPaymentModalProps) {
  const { khrPerUsd } = useExchangeRate();
  const { token } = useAuth();
  const [intent, setIntent] = useState<BarayIntent | null>(null);
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [msRemaining, setMsRemaining] = useState<number>(BARAY_TIMEOUT_MS);
  const [payLinkOpened, setPayLinkOpened] = useState(false);

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

      const deadline = Date.now() + BARAY_TIMEOUT_MS;
      setMsRemaining(BARAY_TIMEOUT_MS);
      countdownTimerRef.current = setInterval(() => {
        setMsRemaining(deadline - Date.now());
      }, 1000);

      timeoutRef.current = setTimeout(() => {
        clearAllTimers();
        setWaiting(false);
        setTimedOut(true);
      }, BARAY_TIMEOUT_MS);

      const tick = async () => {
        const outcome = await pollCustomerBarayState(token, oid);
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
        }
      };

      void tick();
      pollTimerRef.current = setInterval(() => void tick(), BARAY_POLL_MS);
    },
    [token, clearAllTimers, onPaid, onClose],
  );

  const requestIntent = useCallback(async () => {
    if (!token || !orderId) return;
    setLoading(true);
    setError(null);
    setTimedOut(false);
    setPayLinkOpened(false);
    try {
      const data = await createCustomerBarayIntent(token, orderId);
      setIntent(data);
      telegramOpenExternalLink(data.url);
      setPayLinkOpened(true);
      startPolling(orderId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start Baray payment.";
      setError(msg);
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  }, [token, orderId, startPolling]);

  const dismiss = useCallback(() => {
    clearAllTimers();
    onClose();
  }, [clearAllTimers, onClose]);

  useEffect(() => {
    if (orderId == null) return;
    void requestIntent();
    return () => {
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

  const amountLabel =
    totalKhrFallback != null && Number.isFinite(totalKhrFallback)
      ? formatUsdFromKhr(Number(totalKhrFallback), khrPerUsd)
      : null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Pay with Baray"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--text)_62%,transparent)] backdrop-blur-md"
        onClick={dismiss}
        aria-label="Close payment"
      />
      <PaymentDialogCard receiptNumber={receiptNumber} onClose={dismiss}>
        {loading && !intent ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
            <p className="mt-4 text-sm text-[var(--text-muted)]">Preparing Baray checkout…</p>
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
            {amountLabel ? (
              <p className="text-center text-2xl font-bold tabular-nums text-[var(--text)]">{amountLabel}</p>
            ) : null}

            <button
              type="button"
              onClick={() => telegramOpenExternalLink(intent.url)}
              className="brand-primary-button mt-5 w-full rounded-full px-4 py-3.5 text-sm font-bold"
            >
              {payLinkOpened ? "Open Baray again" : "Pay with Baray"}
            </button>

            <div className="mt-5 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {timedOut ? "Link expired" : waiting ? "Waiting for payment…" : "Status"}
              </span>
              <span className="font-mono text-sm font-semibold text-[var(--text)]">
                {timedOut ? "00:00" : formatCountdown(msRemaining)}
              </span>
            </div>

            {timedOut ? (
              <>
                <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
                  This pay link is no longer valid. Start a new one, or close and pay later from your orders.
                </p>
                <button
                  type="button"
                  onClick={() => void requestIntent()}
                  className="brand-primary-button mt-4 w-full rounded-full px-4 py-3 text-sm font-bold"
                >
                  Get new pay link
                </button>
              </>
            ) : (
              <p className="mt-5 text-center text-xs leading-relaxed text-[var(--text-muted)]">
                Complete payment in the Baray app or browser. This window closes automatically once payment is confirmed.
              </p>
            )}

            <button
              type="button"
              onClick={dismiss}
              className="brand-secondary-button mt-5 w-full rounded-full px-4 py-2.5 text-sm font-bold"
            >
              Cancel
            </button>
          </>
        ) : null}
      </PaymentDialogCard>
    </div>
  );
}

function PaymentDialogCard({
  receiptNumber,
  onClose,
  children,
}: {
  receiptNumber?: string | null;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 max-h-[min(100dvh,100svh)] w-full max-w-md overflow-y-auto sm:max-h-[90vh]">
      <div className="brand-card overflow-hidden rounded-t-[2rem] shadow-2xl sm:rounded-[2rem]">
        <div className="relative overflow-hidden border-b border-white/10 bg-[var(--text)] px-4 py-5 text-white sm:px-8 sm:py-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <span className="sr-only">Close</span>
            <CloseIcon />
          </button>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">Baray</p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            {receiptNumber ? `Pay order #${receiptNumber}` : "Pay this order"}
          </h2>
          <p className="mt-1 text-xs text-white/70">
            Tap Pay with Baray to open checkout. We detect payment automatically when you finish.
          </p>
        </div>
        <div className="px-6 pt-6 sm:px-8 sm:pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom),var(--tg-safe-area-inset-bottom,0px))] sm:pb-[max(2rem,env(safe-area-inset-bottom),var(--tg-safe-area-inset-bottom,0px))]">
          {children}
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
