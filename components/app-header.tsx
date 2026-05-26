"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY } from "@/lib/customer-web-flags";

const NAV_ALL = [
  { href: "/", label: "Menu" },
  { href: "/orders", label: "Orders" },
  { href: "/meeting-rooms", label: "Rooms" },
  { href: "/wallet", label: "Wallet" },
  { href: "/rewards", label: "Rewards" },
  { href: "/payments", label: "Payments" },
] as const;

const NAV_GUEST = NAV_ALL.filter(
  (item) => item.href === "/" || item.href === "/meeting-rooms",
);

function navForLoggedInUser() {
  return CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY
    ? NAV_ALL.filter(
        (item) =>
          item.href !== "/wallet" && item.href !== "/rewards" && item.href !== "/payments",
      )
    : NAV_ALL;
}

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

  const navItems = useMemo(() => {
    if (ready && token) return navForLoggedInUser();
    return NAV_GUEST;
  }, [ready, token]);

  return (
    <header className="tg-app-header sticky top-0 z-50 px-2.5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top),var(--tg-safe-area-inset-top,0px))] sm:px-5">
      <div className="tg-header-card mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] border border-white/70 bg-[rgba(255,250,242,0.86)] shadow-[0_22px_70px_-42px_rgba(36,23,15,0.7)] ring-1 ring-[rgba(111,68,35,0.08)] backdrop-blur-2xl">
        <div className="flex min-h-14 items-center justify-between gap-2 px-3 py-2 sm:min-h-16 sm:gap-3 sm:px-4 sm:py-0">
          <nav
            className="tg-mobile-nav no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto md:justify-center md:gap-1.5"
            aria-label="Main"
          >
            {navItems.map(({ href, label }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : href === "/meeting-rooms"
                    ? pathname === "/meeting-rooms" || pathname.startsWith("/meeting-rooms/")
                    : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={
                    active
                      ? "shrink-0 rounded-full bg-[var(--primary-deep)] px-3 py-2 text-xs font-black text-white shadow-[0_12px_28px_-18px_rgba(36,23,15,0.75)] sm:px-4 sm:py-2.5 sm:text-sm"
                      : "shrink-0 rounded-full border border-[var(--border)] bg-white/70 px-3 py-2 text-xs font-bold text-[var(--text-muted)] transition hover:bg-white hover:text-[var(--text)] sm:px-4 sm:py-2.5 sm:text-sm md:border-transparent md:bg-transparent md:hover:bg-white/80"
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
                      ? "flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-sm sm:h-10 sm:w-10"
                      : "flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-white/75 text-[var(--primary-dark)] transition hover:border-[var(--primary)] hover:bg-white sm:h-10 sm:w-10"
                  }
                >
                  <IconUser className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-full border border-[var(--border)] bg-white/75 px-3 py-1.5 text-xs font-bold text-[var(--primary-dark)] transition hover:border-[var(--primary)] hover:bg-white sm:px-3.5 sm:py-2 sm:text-sm"
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
                  className="rounded-full px-2.5 py-1.5 text-xs font-bold text-[var(--primary-dark)] transition hover:bg-white/80 sm:px-3 sm:py-2 sm:text-sm"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={openRegister}
                  className="brand-primary-button rounded-full px-3 py-1.5 text-xs font-bold sm:px-4 sm:py-2 sm:text-sm"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
