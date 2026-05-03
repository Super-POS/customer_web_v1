import { formatRiel } from "@/lib/api";
import { IconClose } from "./icons";
import { OrderCartPanel } from "./order-cart-panel";
import type { CartLine, MenuCategory } from "./types";

export function MenuCartSidebar({
  open,
  onClose,
  menus,
  cartLines,
  cartCount,
  subtotal,
  payableTotal,
  placingOrder,
  token,
  placeOrder,
  setLineQty,
  couponCodeInput,
  onCouponCodeInputChange,
  matchedActiveCoupon,
}: {
  open: boolean;
  onClose: () => void;
  menus: MenuCategory[];
  cartLines: CartLine[];
  cartCount: number;
  subtotal: number;
  payableTotal: number;
  placingOrder: boolean;
  token: string | null;
  placeOrder: () => void | Promise<void>;
  setLineQty: (menuId: number, modifierIds: number[], qty: number) => void;
  couponCodeInput: string;
  onCouponCodeInputChange: (value: string) => void;
  matchedActiveCoupon: { code: string; discount_percent: number } | null;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--text)_42%,transparent)] backdrop-blur-[2px]"
        aria-label="Close cart"
        onClick={onClose}
      />
      <aside
        className="tg-cart-sidebar absolute inset-y-0 right-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-[-24px_0_80px_-28px_rgba(34,34,33,0.35)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-sidebar-title"
      >
        <header className="tg-cart-sidebar-header shrink-0 border-b border-[var(--border)] px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top),var(--tg-safe-area-inset-top,0px))] sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="tg-drawer-eyebrow text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--primary)]">Club54</p>
              <h2
                id="cart-sidebar-title"
                className="mt-0.5 font-[family-name:var(--font-oswald)] text-xl font-semibold tracking-tight text-[var(--text)]"
              >
                Your cart
              </h2>
              <p className="mt-2 text-sm leading-snug text-[var(--text-muted)]">
                {cartCount === 0 ? (
                  "Items you add appear here. Review quantities before checkout."
                ) : (
                  <>
                    <span className="font-semibold text-[var(--text)]">{cartCount}</span>
                    {cartCount === 1 ? " item" : " items"}
                    <span className="text-[var(--text-muted)]"> · </span>
                    <span className="font-semibold tabular-nums text-[var(--primary)]">{formatRiel(payableTotal)} ៛</span>
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-[var(--border)] bg-white/80 p-2.5 text-[var(--text-muted)] shadow-sm transition hover:border-[var(--primary)]/30 hover:bg-[var(--page)] hover:text-[var(--text)]"
              aria-label="Close cart"
            >
              <IconClose className="h-5 w-5" />
            </button>
          </div>
        </header>

        <OrderCartPanel
          variant="drawer"
          menus={menus}
          cartLines={cartLines}
          cartCount={cartCount}
          subtotal={subtotal}
          payableTotal={payableTotal}
          placingOrder={placingOrder}
          token={token}
          placeOrder={placeOrder}
          setLineQty={setLineQty}
          couponCodeInput={couponCodeInput}
          onCouponCodeInputChange={onCouponCodeInputChange}
          matchedActiveCoupon={matchedActiveCoupon}
          panelClassName="min-h-0 flex-1 flex flex-col"
        />
      </aside>
    </div>
  );
}
