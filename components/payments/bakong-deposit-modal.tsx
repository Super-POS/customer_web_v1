"use client";

import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  abandonAllPendingBakongDeposits,
  abandonCustomerBakongDeposit,
  BAKONG_POLL_MS,
  BAKONG_TIMEOUT_MS,
  createCustomerBakongDepositIntent,
  pollCustomerBakongDepositState,
  type BakongIntent,
} from "@/lib/bakong-client";
import { BakongBankPicker } from "@/components/payments/bakong-bank-picker";
import { useAuth } from "@/lib/auth-context";
import { canShowKhqrBankPicker } from "@/lib/khqr-bank-links";
import { notifyError, notifySuccess } from "@/lib/notify";

type BakongDepositModalProps = {
  /** Deposit amount in USD (matches the wallet form). */
  amountUsd: number | null;
  /** When true, closing the modal keeps the pending deposit (resume / pay in bank app). */
  preservePendingOnClose?: boolean;
  onClose: () => void;
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

export function BakongDepositModal({
  amountUsd,
  preservePendingOnClose = false,
  onClose,
  onPaid,
}: BakongDepositModalProps) {
  const { token } = useAuth();
  const [intent, setIntent] = useState<(BakongIntent & { wallet_transaction_id: number }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [msRemaining, setMsRemaining] = useState<number>(BAKONG_TIMEOUT_MS);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const walletTxIdRef = useRef<number | null>(null);
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
    (walletTransactionId: number) => {
      if (!token) return;
      walletTxIdRef.current = walletTransactionId;
      clearAllTimers();
      setWaiting(true);
      setTimedOut(false);

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
        const outcome = await pollCustomerBakongDepositState(token, walletTransactionId);
        if (outcome === "paid") {
          clearAllTimers();
          setWaiting(false);
          notifySuccess("Deposit received. Your balance has been updated.");
          onPaid?.();
          onClose();
        } else if (outcome === "cancelled") {
          clearAllTimers();
          setWaiting(false);
          setTimedOut(true);
          setIntent(null);
          setError("This deposit QR expired. Generate a new one to try again.");
        }
      };

      void tick();
      pollTimerRef.current = setInterval(() => void tick(), BAKONG_POLL_MS);
    },
    [token, clearAllTimers, onPaid, onClose],
  );

  const cancelPendingDeposit = useCallback(async () => {
    if (!token) return;
    const txId = walletTxIdRef.current ?? intent?.wallet_transaction_id ?? null;
    try {
      if (txId != null) {
        await abandonCustomerBakongDeposit(token, txId);
      } else {
        await abandonAllPendingBakongDeposits(token);
      }
    } catch {
      /* best-effort */
    }
    walletTxIdRef.current = null;
  }, [token, intent?.wallet_transaction_id]);

  const cancelPendingDepositRef = useRef(cancelPendingDeposit);
  const preservePendingRef = useRef(preservePendingOnClose);
  useEffect(() => {
    cancelPendingDepositRef.current = cancelPendingDeposit;
    preservePendingRef.current = preservePendingOnClose;
  }, [cancelPendingDeposit, preservePendingOnClose]);

  const requestIntent = useCallback(async () => {
    if (!token || amountUsd == null || amountUsd <= 0) return;
    setLoading(true);
    setError(null);
    setTimedOut(false);
    try {
      if (timedOut) {
        await cancelPendingDeposit();
      }
      const data = await createCustomerBakongDepositIntent(token, amountUsd);
      setIntent(data);
      startPolling(data.wallet_transaction_id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not generate KHQR.";
      setError(msg);
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  }, [token, amountUsd, startPolling, timedOut, cancelPendingDeposit]);

  const dismiss = useCallback(async () => {
    if (!preservePendingRef.current) {
      await cancelPendingDeposit();
    }
    clearAllTimers();
    onClose();
  }, [cancelPendingDeposit, clearAllTimers, onClose]);

  const cancelAndClose = useCallback(async () => {
    await cancelPendingDeposit();
    clearAllTimers();
    onClose();
  }, [cancelPendingDeposit, clearAllTimers, onClose]);

  useEffect(() => {
    if (amountUsd == null) return;
    const t = setTimeout(() => void requestIntent(), 0);
    return () => {
      clearTimeout(t);
      clearAllTimers();
      if (token && !preservePendingRef.current) {
        void cancelPendingDepositRef.current();
      }
    };
    // Only re-run when the deposit amount changes — not when intent/poll state updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- requestIntent is stable enough for amountUsd
  }, [amountUsd, clearAllTimers, token]);

  useEffect(() => {
    if (amountUsd == null) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [amountUsd]);

  if (amountUsd == null) return null;

  const amount = formatQrAmount(intent);

  return (
    <div
        className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-label="Deposit with Bakong KHQR"
      >
        <button
          type="button"
          className="absolute inset-0 bg-[color-mix(in_srgb,var(--text)_62%,transparent)] backdrop-blur-md"
          onClick={() => void dismiss()}
          aria-label="Close deposit"
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
              <h2 className="mt-1 text-xl font-semibold text-white">Top up your wallet</h2>
              <p className="mt-1 text-xs text-white/70">
                Scan the QR with Bakong or any KHQR app, or tap Pay with Bakong below. Your balance updates automatically.
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
                      {amount}
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
                        This QR is no longer valid. Generate a new one or close and try again later.
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
                        ? "Tap Pay with Bakong below, or scan the QR with any KHQR app. We close this window once your deposit clears."
                        : "Open your banking app, choose Scan KHQR, and confirm the transfer. We will close this window once your deposit clears."}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => void cancelAndClose()}
                    className="brand-secondary-button mt-5 w-full rounded-full px-4 py-2.5 text-sm font-bold"
                  >
                    {preservePendingOnClose ? "Cancel deposit" : "Cancel"}
                  </button>
                  {preservePendingOnClose ? (
                    <button
                      type="button"
                      onClick={() => void dismiss()}
                      className="mt-2 w-full rounded-full px-4 py-2.5 text-xs font-bold text-[var(--text-muted)] underline-offset-2 hover:underline"
                    >
                      Close and keep waiting for payment
                    </button>
                  ) : null}
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
