"use client";

import { formatUsdFromKhr } from "@/lib/api";
import { useExchangeRate } from "@/contexts/exchange-rate-context";
import { IconCart } from "./icons";

export function MenuFloatingCart({
  cartCount,
  totalPrice,
  onOpen,
}: {
  cartCount: number;
  totalPrice: number;
  onOpen: () => void;
}) {
  const { khrPerUsd } = useExchangeRate();
  return (
    <div className="pointer-events-none fixed bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.75rem),calc(var(--tg-safe-area-inset-bottom,0px)+0.75rem))] right-[max(1rem,env(safe-area-inset-right))] z-[55] lg:bottom-8 lg:right-8">
      <button
        type="button"
        onClick={onOpen}
        aria-label={
          cartCount === 0
            ? "Your cart — tap to review or add items from the menu"
            : `Your cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}, total ${formatUsdFromKhr(totalPrice, khrPerUsd)}`
        }
        className={`pointer-events-auto relative flex min-h-[3.5rem] min-w-[3.5rem] touch-manipulation items-center justify-center rounded-2xl border border-black/[0.08] bg-[var(--surface)] shadow-[0_12px_40px_-12px_rgba(44,41,39,0.32)] ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-14px_rgba(44,41,39,0.38)] active:translate-y-0 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
          cartCount > 0 ? "text-[var(--primary)]" : "text-[var(--text-muted)]"
        }`}
      >
        <IconCart className="h-6 w-6" />
        {cartCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[11px] font-bold tabular-nums text-white shadow-sm">
            {cartCount > 99 ? "99+" : cartCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
