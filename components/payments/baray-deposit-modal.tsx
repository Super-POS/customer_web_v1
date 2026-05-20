"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BARAY_POLL_MS,
  BARAY_TIMEOUT_MS,
  createCustomerBarayDepositIntent,
  pollCustomerBarayDepositState,
  type BarayIntent,
} from "@/lib/baray-client";
import { formatUsd } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { notifyError, notifySuccess } from "@/lib/notify";
import { telegramOpenExternalLink } from "@/lib/telegram-webapp";

type BarayDepositModalProps = {
  amountUsd: number | null;
  /** Resume an existing pending deposit — poll only, do not create a new intent. */
  walletTransactionId?: number | null;
  preservePendingOnClose?: boolean;
  onClose: () => void;
  onPaid?: () => void;
};

function formatCountdown(msRemaining: number): string {
  const safe = Math.max(0, Math.floor(msRemaining / 1000));
  const m = Math.floor(safe / 60).toString().padStart(2, "0");
  const s = (safe % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function BarayDepositModal({
  amountUsd,
  walletTransactionId: resumeWalletTxId = null,
  preservePendingOnClose = false,
  onClose,
  onPaid,
}: BarayDepositModalProps) {
  const { token } = useAuth();
  const [intent, setIntent] = useState<(BarayIntent & { wallet_transaction_id: number }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [msRemaining, setMsRemaining] = useState<number>(BARAY_TIMEOUT_MS);
  const [payLinkOpened, setPayLinkOpened] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const walletTxIdRef = useRef<number | null>(resumeWalletTxId);

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
        const outcome = await pollCustomerBarayDepositState(token, walletTransactionId);
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
          setError("This deposit was declined or expired.");
        }
      };

      void tick();
      pollTimerRef.current = setInterval(() => void tick(), BARAY_POLL_MS);
    },
    [token, clearAllTimers, onPaid, onClose],
  );

  const requestIntent = useCallback(async () => {
    if (!token || amountUsd == null || amountUsd <= 0) return;
    setLoading(true);
    setError(null);
    setTimedOut(false);
    setPayLinkOpened(false);
    try {
      const data = await createCustomerBarayDepositIntent(token, amountUsd);
      setIntent(data);
      telegramOpenExternalLink(data.url);
      setPayLinkOpened(true);
      startPolling(data.wallet_transaction_id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start Baray deposit.";
      setError(msg);
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  }, [token, amountUsd, startPolling]);

  const dismiss = useCallback(() => {
    clearAllTimers();
    onClose();
  }, [clearAllTimers, onClose]);

  useEffect(() => {
    if (amountUsd == null && resumeWalletTxId == null) return;
    if (resumeWalletTxId != null && preservePendingOnClose) {
      startPolling(resumeWalletTxId);
    } else if (amountUsd != null) {
      void requestIntent();
    }
    return () => {
      clearAllTimers();
    };
  }, [amountUsd, resumeWalletTxId, preservePendingOnClose, requestIntent, startPolling, clearAllTimers]);

  useEffect(() => {
    if (amountUsd == null && resumeWalletTxId == null) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [amountUsd, resumeWalletTxId]);

  if (amountUsd == null && resumeWalletTxId == null) return null;

  const displayAmount =
    amountUsd != null && Number.isFinite(amountUsd) ? formatUsd(amountUsd) : null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Deposit with Baray"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--text)_62%,transparent)] backdrop-blur-md"
        onClick={dismiss}
        aria-label="Close deposit"
      />
      <div className="relative z-10 max-h-[min(100dvh,100svh)] w-full max-w-md overflow-y-auto sm:max-h-[90vh]">
        <div className="brand-card overflow-hidden rounded-t-[2rem] shadow-2xl sm:rounded-[2rem]">
          <DepositModalHeader onClose={dismiss} />
          <div className="px-6 pt-6 sm:px-8 sm:pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom),var(--tg-safe-area-inset-bottom,0px))] sm:pb-[max(2rem,env(safe-area-inset-bottom),var(--tg-safe-area-inset-bottom,0px))]">
            {loading && !intent && resumeWalletTxId == null ? (
              <div className="flex flex-col items-center justify-center py-12">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
                <p className="mt-4 text-sm text-[var(--text-muted)]">Preparing Baray checkout…</p>
              </div>
            ) : error && !intent && resumeWalletTxId == null ? (
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
            ) : intent || resumeWalletTxId != null ? (
              <>
                {displayAmount ? (
                  <p className="text-center text-2xl font-bold tabular-nums text-[var(--text)]">{displayAmount}</p>
                ) : null}

                {intent?.url ? (
                  <button
                    type="button"
                    onClick={() => telegramOpenExternalLink(intent.url)}
                    className="brand-primary-button mt-5 w-full rounded-full px-4 py-3.5 text-sm font-bold"
                  >
                    {payLinkOpened ? "Open Baray again" : "Pay with Baray"}
                  </button>
                ) : resumeWalletTxId != null ? (
                  <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
                    If you already opened Baray, complete payment there. We are checking for confirmation.
                  </p>
                ) : null}

                <div className="mt-5 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {timedOut ? "Link expired" : waiting ? "Waiting for payment…" : "Status"}
                  </span>
                  <span className="font-mono text-sm font-semibold text-[var(--text)]">
                    {timedOut ? "00:00" : formatCountdown(msRemaining)}
                  </span>
                </div>

                {timedOut && resumeWalletTxId == null ? (
                  <>
                    <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
                      This pay link is no longer valid. Generate a new one or close and try again later.
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
                    Complete payment in Baray. Your wallet balance updates automatically once confirmed.
                  </p>
                )}

                <button
                  type="button"
                  onClick={dismiss}
                  className="brand-secondary-button mt-5 w-full rounded-full px-4 py-2.5 text-sm font-bold"
                >
                  {preservePendingOnClose ? "Close" : "Cancel"}
                </button>
                {preservePendingOnClose ? (
                  <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
                    Your pending deposit stays active. We keep checking for payment in the background.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function DepositModalHeader({ onClose }: { onClose: () => void }) {
  return (
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
      <h2 className="mt-1 text-xl font-semibold text-white">Top up your wallet</h2>
      <p className="mt-1 text-xs text-white/70">
        Tap Pay with Baray to open checkout. Your balance updates automatically after payment.
      </p>
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
