"use client";

import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/contexts/auth-modal-context";

export function SignInGate({ children }: { children: React.ReactNode }) {
  const { token, ready, isTelegramWebApp, authError } = useAuth();
  const { openLogin } = useAuthModal();

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--primary)_20%,white)] border-t-[var(--primary)] shadow-sm" />
          <p className="text-sm text-[var(--text-muted)]">Loading…</p>
        </div>
      </div>
    );
  }

  if (isTelegramWebApp && authError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="brand-card relative overflow-hidden rounded-[2rem] px-7 py-12">
          <div className="absolute left-1/2 top-0 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--primary)]/10" />
          <div className="relative">
            <p className="brand-kicker">Club54</p>
            <h1 className="brand-title mt-3 text-3xl">Telegram sign in failed</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--text-muted)]">
              {authError}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    if (isTelegramWebApp) {
      return (
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <div className="brand-card relative overflow-hidden rounded-[2rem] px-7 py-12">
            <div className="absolute left-1/2 top-0 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--primary)]/10" />
            <div className="relative">
              <p className="brand-kicker">Club54</p>
              <h1 className="brand-title mt-3 text-3xl">Open from Telegram</h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--text-muted)]">
                Wallet, orders, and rewards need your Telegram session. Close this tab and tap the Mini App
                button on the Club54 bot again.
              </p>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="brand-card relative overflow-hidden rounded-[2rem] px-7 py-12">
          <div className="absolute left-1/2 top-0 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--primary)]/10" />
          <div className="relative">
            <p className="brand-kicker">Club54</p>
            <h1 className="brand-title mt-3 text-3xl">Sign in required</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--text-muted)]">
              Sign in with your phone or email to view orders, wallet, rewards, and payments.
            </p>
            <button
              type="button"
              onClick={openLogin}
              className="brand-primary-button mt-7 rounded-full px-7 py-3 text-sm font-bold"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
