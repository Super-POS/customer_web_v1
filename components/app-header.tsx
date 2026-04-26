"use client";

import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { BrandLogo } from "./brand-logo";

export function AppHeader() {
  const { token, signOut, ready } = useAuth();
  const { openLogin, openRegister } = useAuthModal();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/90 bg-slate-950 shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <BrandLogo size="md" priority href="/" />

        <div className="flex items-center gap-1.5 sm:gap-2">
          {ready && token && (
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg border border-slate-600/80 bg-slate-900/50 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Sign out
            </button>
          )}
          {ready && !token && (
            <>
              <button
                type="button"
                onClick={openLogin}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={openRegister}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-400"
              >
                Register
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
