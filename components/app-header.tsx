"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { BrandLogo } from "./brand-logo";

const NAV = [
  { href: "/", label: "Menu" },
  { href: "/orders", label: "Orders" },
  { href: "/wallet", label: "Wallet" },
  { href: "/rewards", label: "Rewards" },
  { href: "/payments", label: "Payments" },
] as const;

function IconUser({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M20 21a8 8 0 0 0-16 0" strokeLinecap="round" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const { token, signOut, ready, isTelegramWebApp } = useAuth();
  const { openLogin, openRegister } = useAuthModal();

  return (
    <header className="sticky top-0 z-50 px-2.5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top),var(--tg-safe-area-inset-top,0px))] sm:px-5">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] border border-white/70 bg-[rgba(255,250,242,0.86)] shadow-[0_22px_70px_-42px_rgba(36,23,15,0.7)] ring-1 ring-[rgba(111,68,35,0.08)] backdrop-blur-2xl">
        <div className="flex min-h-16 items-center justify-between gap-3 px-3 sm:px-4">

          <nav
            className="no-scrollbar hidden min-w-0 flex-1 justify-center overflow-x-auto md:flex md:gap-1.5"
            aria-label="Main"
          >
            {NAV.map(({ href, label }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={
                    active
                      ? "shrink-0 rounded-full bg-[var(--primary-deep)] px-4 py-2.5 text-sm font-black text-white shadow-[0_12px_28px_-18px_rgba(36,23,15,0.75)]"
                      : "shrink-0 rounded-full px-4 py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:bg-white/80 hover:text-[var(--text)]"
                  }
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {ready && token && (
              <>
                <Link
                  href="/profile"
                  aria-label="Profile"
                  title="Profile"
                  className={
                    pathname.startsWith("/profile")
                      ? "flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-sm"
                      : "flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white/75 text-[var(--primary-dark)] transition hover:border-[var(--primary)] hover:bg-white"
                  }
                >
                  <IconUser className="h-5 w-5" />
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-full border border-[var(--border)] bg-white/75 px-3.5 py-2 text-sm font-bold text-[var(--primary-dark)] transition hover:border-[var(--primary)] hover:bg-white"
                >
                  Sign out
                </button>
              </>
            )}
            {ready && !token && !isTelegramWebApp && (
              <>
                <button
                  type="button"
                  onClick={openLogin}
                  className="rounded-full px-3 py-2 text-sm font-bold text-[var(--primary-dark)] transition hover:bg-white/80"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={openRegister}
                  className="brand-primary-button rounded-full px-4 py-2 text-sm font-bold"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>

        <nav
          className="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-[var(--border)] bg-white/35 px-3 py-2.5 md:hidden"
          aria-label="Main mobile"
        >
          {NAV.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={
                  active
                    ? "shrink-0 rounded-full bg-[var(--primary-deep)] px-3.5 py-2 text-xs font-black text-white shadow-sm"
                    : "shrink-0 rounded-full border border-[var(--border)] bg-white/70 px-3.5 py-2 text-xs font-bold text-[var(--text-muted)]"
                }
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
