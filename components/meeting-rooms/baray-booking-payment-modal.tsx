"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createCustomerBookingBarayIntent,
  pollCustomerBookingPaymentState,
  type BarayBookingIntent,
} from "@/lib/meeting-room";
import { notifyError, notifySuccess } from "@/lib/notify";
import { telegramOpenExternalLink } from "@/lib/telegram-webapp";
import { useAuth } from "@/lib/auth-context";

const POLL_MS = 3000;
const TIMEOUT_MS = 10 * 60_000;

function formatCountdown(msRemaining: number): string {
  const safe = Math.max(0, Math.floor(msRemaining / 1000));
  const m = Math.floor(safe / 60).toString().padStart(2, "0");
  const s = (safe % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function BarayBookingPaymentModal({
  bookingId,
  onClose,
  onPaid,
}: {
  bookingId: number | null;
  onClose: () => void;
  onPaid?: () => void;
}) {
  const { token } = useAuth();
  const [intent, setIntent] = useState<BarayBookingIntent | null>(null);
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [msRemaining, setMsRemaining] = useState<number>(TIMEOUT_MS);
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
    (id: number) => {
      if (!token) return;
      clearAllTimers();
      setWaiting(true);
      setTimedOut(false);

      const deadline = Date.now() + TIMEOUT_MS;
      setMsRemaining(TIMEOUT_MS);
      countdownTimerRef.current = setInterval(() => setMsRemaining(deadline - Date.now()), 1000);

      timeoutRef.current = setTimeout(() => {
        clearAllTimers();
        setWaiting(false);
        setTimedOut(true);
      }, TIMEOUT_MS);

      const tick = async () => {
        const outcome = await pollCustomerBookingPaymentState(token, id);
        if (outcome === "paid") {
          clearAllTimers();
          setWaiting(false);
          notifySuccess("Payment received. Our team will confirm your booking soon.");
          onPaid?.();
        } else if (outcome === "cancelled") {
          clearAllTimers();
          setWaiting(false);
          setError("Payment failed or booking was cancelled.");
        }
      };

      void tick();
      pollTimerRef.current = setInterval(() => void tick(), POLL_MS);
    },
    [token, clearAllTimers, onPaid],
  );

  const requestIntent = useCallback(async () => {
    if (!token || !bookingId) return;
    setLoading(true);
    setError(null);
    setTimedOut(false);
    setPayLinkOpened(false);
    try {
      const data = await createCustomerBookingBarayIntent(token, bookingId);
      setIntent(data);
      telegramOpenExternalLink(data.url);
      setPayLinkOpened(true);
      startPolling(bookingId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start Baray payment.";
      setError(msg);
      notifyError(msg);
    } finally {
      setLoading(false);
    }
  }, [token, bookingId, startPolling]);

  const dismiss = useCallback(() => {
    clearAllTimers();
    onClose();
  }, [clearAllTimers, onClose]);

  useEffect(() => {
    if (bookingId == null) return;
    const t = setTimeout(() => void requestIntent(), 0);
    return () => {
      clearTimeout(t);
      clearAllTimers();
    };
  }, [bookingId, requestIntent, clearAllTimers]);

  useEffect(() => {
    if (bookingId == null) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [bookingId]);

  if (bookingId == null) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Pay booking with Baray"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-[color-mix(in_srgb,var(--text)_62%,transparent)] backdrop-blur-md"
        onClick={dismiss}
        aria-label="Close payment"
      />
      <div className="relative z-10 w-full max-w-[460px] overflow-hidden rounded-t-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-[0_30px_80px_-55px_rgba(0,0,0,0.75)] sm:rounded-[2rem]">
        <div className="bg-[var(--primary-deep)] px-5 pb-5 pt-5 text-white sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-white/55">
                Meeting room booking
              </p>
              <p className="mt-1 font-[family-name:var(--font-oswald)] text-xl font-bold">Pay with Baray</p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="cursor-pointer rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors duration-200 hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6 px-5 pb-6 pt-6 sm:px-6">
          {loading && !intent ? (
            <div className="flex flex-col items-center justify-center py-10">
              <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--primary)]" />
              <p className="mt-4 text-sm text-[var(--text-muted)]">Preparing Baray checkout…</p>
            </div>
          ) : error && !intent ? (
            <div className="flex flex-col items-center gap-6 py-6 text-center">
              <p className="text-sm font-semibold text-[var(--primary-dark)]">{error}</p>
              <button
                type="button"
                onClick={() => void requestIntent()}
                className="brand-secondary-button cursor-pointer rounded-full px-5 py-2.5 text-sm font-bold"
              >
                Try again
              </button>
            </div>
          ) : intent ? (
            <>
              <button
                type="button"
                onClick={() => telegramOpenExternalLink(intent.url)}
                className="brand-primary-button w-full cursor-pointer rounded-full px-4 py-3 text-sm font-bold"
              >
                {payLinkOpened ? "Open Baray again" : "Pay with Baray"}
              </button>

              <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--primary-soft)] px-5 py-4">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary-dark)]">
                  {timedOut ? "Link expired" : waiting ? "Waiting for payment…" : "Status"}
                </span>
                <span className="font-mono text-sm font-semibold text-[var(--text)]">
                  {timedOut ? "00:00" : formatCountdown(msRemaining)}
                </span>
              </div>

              {timedOut ? (
                <>
                  <p className="text-center text-xs text-[var(--text-muted)]">
                    This pay link expired. Start a new one.
                  </p>
                  <button
                    type="button"
                    onClick={() => void requestIntent()}
                    className="brand-primary-button w-full cursor-pointer rounded-full px-4 py-3 text-sm font-bold"
                  >
                    Generate new pay link
                  </button>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
