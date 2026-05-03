"use client";

import { formatUsdFromKhr } from "@/lib/api";
import { useExchangeRate } from "@/contexts/exchange-rate-context";
import { cartLineKey } from "./cart";
import { findMenuById, lineUnitPrice, modifierSummaryText, previewCouponDiscount } from "./menu-helpers";
import { IconTrash } from "./icons";
import { QtyStepper } from "./qty-stepper";
import type { CartLine, MenuCategory } from "./types";

export function OrderCartPanel({
  menus,
  cartLines,
  cartCount,
  subtotal,
  payableTotal,
  placingOrder,
  token,
  placeOrder,
  setLineQty,
  couponCodeInput = "",
  onCouponCodeInputChange,
  matchedActiveCoupon = null,
  panelClassName,
  variant = "card",
}: {
  menus: MenuCategory[];
  cartLines: CartLine[];
  cartCount: number;
  subtotal: number;
  payableTotal: number;
  placingOrder: boolean;
  token: string | null;
  placeOrder: () => void | Promise<void>;
  setLineQty: (menuId: number, modifierIds: number[], qty: number) => void;
  couponCodeInput?: string;
  onCouponCodeInputChange?: (value: string) => void;
  matchedActiveCoupon?: { code: string; discount_percent: number } | null;
  panelClassName?: string;
  /** `drawer`: full-height column with scroll list + pinned footer (cart sidebar). */
  variant?: "card" | "drawer";
}) {
  const { khrPerUsd } = useExchangeRate();
  const isDrawer = variant === "drawer";

  const discountPreview =
    token && matchedActiveCoupon
      ? previewCouponDiscount(subtotal, matchedActiveCoupon.discount_percent)
      : 0;

  const lineList = (
    <>
      {cartCount === 0 && (
        <p
          className={
            isDrawer
              ? "rounded-xl border border-dashed border-[var(--border)] bg-[var(--page)]/80 px-4 py-12 text-center text-sm leading-relaxed text-[var(--text-muted)]"
              : "py-10 text-center text-[13px] leading-relaxed text-[var(--text-muted)]"
          }
        >
          {isDrawer
            ? "Your cart is empty. Add items from the menu to continue."
            : "Tap a dish to open details, or use quick qty on items without options."}
        </p>
      )}
      {cartLines.map((line) => {
        const pid = line.menu_id;
        const menu = findMenuById(menus, pid);
        const name = menu?.name || `Item #${pid}`;
        const mods = line.modifier_option_ids;
        const summary = modifierSummaryText(menu, mods);
        const u = lineUnitPrice(menu, mods);
        const q = line.quantity;
        const rowKey = cartLineKey(pid, mods);
        return (
          <div
            key={rowKey}
            className={
              isDrawer
                ? "rounded-xl border border-[var(--border)] bg-white/85 p-4 text-[13px] shadow-sm"
                : "rounded-xl bg-[var(--surface)] p-3 text-[13px] shadow-sm ring-1 ring-black/[0.04] transition hover:-translate-y-0.5 hover:ring-black/[0.08]"
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug text-[var(--text)]">{name}</p>
                {summary ? <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">{summary}</p> : null}
              </div>
              <button
                type="button"
                disabled={placingOrder}
                onClick={() => setLineQty(pid, mods, 0)}
                aria-label={`Remove ${name} from cart`}
                className="shrink-0 rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] hover:text-[var(--primary)] disabled:pointer-events-none disabled:opacity-40"
              >
                <IconTrash className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-[var(--border)]/80 pt-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Qty</p>
                <div className="mt-1.5">
                  <QtyStepper value={q} disabled={placingOrder} onChange={(n) => setLineQty(pid, mods, n)} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Line</p>
                <p className="mt-1 font-semibold tabular-nums text-[var(--text)]">{formatUsdFromKhr(u * q, khrPerUsd)}</p>
                <p className="text-[11px] tabular-nums text-[var(--text-muted)]">{formatUsdFromKhr(u, khrPerUsd)} each</p>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );

  const footer = (
    <div className="w-full space-y-4">
      {token ? (
        <div className="space-y-1.5">
          <label
            htmlFor="checkout-coupon"
            className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]"
          >
            Coupon code
          </label>
          <input
            id="checkout-coupon"
            type="text"
            value={couponCodeInput}
            disabled={placingOrder || cartCount === 0}
            onChange={(e) => onCouponCodeInputChange?.(e.target.value.toUpperCase())}
            placeholder="Optional"
            maxLength={64}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 font-mono text-sm font-medium uppercase tracking-wide text-[var(--text)] shadow-sm outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:font-sans focus:border-[var(--primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_22%,transparent)] disabled:opacity-50"
          />
        </div>
      ) : null}

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">Subtotal</span>
        <span
          className={
            isDrawer
              ? "text-lg font-semibold tabular-nums tracking-tight text-[var(--text)]"
              : "text-xl font-semibold tabular-nums tracking-tight text-[var(--text)]"
          }
        >
          {formatUsdFromKhr(subtotal, khrPerUsd)}
        </span>
      </div>

      {discountPreview > 0 && matchedActiveCoupon ? (
        <div className="flex items-baseline justify-between gap-4 text-green-700 dark:text-green-400">
          <span className="text-xs font-bold uppercase tracking-[0.14em]">
            Discount ({matchedActiveCoupon.code}, {matchedActiveCoupon.discount_percent}%)
          </span>
          <span className={`tabular-nums font-semibold ${isDrawer ? "text-base" : "text-lg"}`}>
            -{formatUsdFromKhr(discountPreview, khrPerUsd)}
          </span>
        </div>
      ) : null}

      <div className="flex items-baseline justify-between gap-4 border-t border-[var(--border)] pt-3">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">Total due</span>
        <span
          className={
            isDrawer
              ? "text-2xl font-bold tabular-nums tracking-tight text-[var(--primary)]"
              : "text-3xl font-bold tabular-nums tracking-tight text-[var(--primary)]"
          }
        >
          {formatUsdFromKhr(payableTotal, khrPerUsd)}
        </span>
      </div>
      <button
        type="button"
        onClick={() => void placeOrder()}
        disabled={placingOrder || cartCount === 0}
        className="brand-primary-button flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold tracking-wide disabled:pointer-events-none disabled:opacity-40 sm:py-4 sm:text-[15px]"
      >
        {placingOrder ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Sending…
          </>
        ) : token ? (
          "Place order"
        ) : (
          "Sign in to order"
        )}
      </button>
    </div>
  );

  if (isDrawer) {
    return (
      <div className={`order-cart-panel-drawer flex min-h-0 flex-1 flex-col ${panelClassName ?? ""}`.trim()}>
        <div className="order-cart-panel-drawer-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 sm:px-5">
          <div className="order-cart-panel-drawer-list space-y-3">{lineList}</div>
        </div>
        <div className="order-cart-panel-drawer-footer shrink-0 border-t border-[var(--border)] bg-[var(--page)] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom),var(--tg-safe-area-inset-bottom,0px))] sm:px-5">
          {footer}
        </div>
      </div>
    );
  }

  return (
    <div className={`brand-card rounded-[1.75rem] p-6 sm:p-7${panelClassName ? ` ${panelClassName}` : ""}`}>
      <div className="mb-6 space-y-3 rounded-2xl bg-[var(--page)] p-3">{lineList}</div>
      <div className="border-t border-black/[0.06] pt-5">{footer}</div>
    </div>
  );
}
