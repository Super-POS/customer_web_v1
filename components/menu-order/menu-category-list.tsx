"use client";

import { formatUsdFromKhr, mediaUrl } from "@/lib/api";
import { useExchangeRate } from "@/contexts/exchange-rate-context";
import { notifySuccess } from "@/lib/notify";
import { totalQtyForMenu } from "./cart";
import { CoffeePlaceholder } from "./coffee-placeholder";
import { menuHasModifiers } from "./menu-helpers";
import type { CartLine, MenuCategory, MenuItem } from "./types";

export type MenuCategoryListProps = {
  menus: MenuCategory[];
  cartLines: CartLine[];
  onOpenItem: (item: MenuItem, categoryName: string) => void;
  onAddSimple: (productId: number, nextQty: number) => void;
};

export function MenuCategoryList({ menus, cartLines, onOpenItem, onAddSimple }: MenuCategoryListProps) {
  const { khrPerUsd } = useExchangeRate();
  return (
    <div
      id="menu-list"
      className="mx-auto max-w-6xl scroll-mt-28 sm:scroll-mt-32 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] max-[380px]:pl-3 max-[380px]:pr-3 sm:pl-6 sm:pr-6"
    >
      <div className="space-y-9 pt-6 sm:space-y-12 sm:pt-8 lg:pt-10">
        {menus.map((group) => (
          <section key={group.id} id={`cat-${group.id}`} className="scroll-mt-24 sm:scroll-mt-28">
            <header className="tg-menu-section-title mb-4 border-l-[4px] border-[var(--primary)] pl-3 sm:mb-5 sm:pl-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[var(--text-muted)]">Menu</p>
              <h2 className="mt-1.5 font-[family-name:var(--font-oswald)] text-[clamp(1.35rem,3.5vw+0.65rem,1.75rem)] font-semibold tracking-tight text-[var(--text)]">
                {group.name}
              </h2>
            </header>
            <ul className="tg-menu-grid grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
              {group.menus.map((p) => {
                const img = mediaUrl(p.image);
                const hasMod = menuHasModifiers(p);
                const qty = totalQtyForMenu(cartLines, p.id);
                const hasQty = qty > 0;
                return (
                  <li key={p.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpenItem(p, group.name)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onOpenItem(p, group.name);
                        }
                      }}
                      className={`brand-card-hover brand-card group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:rounded-[1.35rem] ${
                        hasQty ? "ring-2 ring-[var(--primary)]/45 shadow-[0_12px_36px_-14px_color-mix(in_srgb,var(--primary)_28%,transparent)]" : ""
                      }`}
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--page)]">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt=""
                            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <CoffeePlaceholder className="h-11 w-11 text-[var(--text-muted)] opacity-40 sm:h-12 sm:w-12" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between gap-2.5 p-3 sm:gap-3 sm:p-4">
                        <div>
                          <p className="font-[family-name:var(--font-oswald)] text-[13px] font-semibold leading-snug text-[var(--text)] sm:text-base">{p.name}</p>
                          {p.code && (
                            <p className="mt-1 font-mono text-[9px] tracking-[0.06em] text-[var(--text-muted)] sm:text-[10px]">{p.code}</p>
                          )}
                          <p className="mt-2 text-sm font-bold tabular-nums tracking-tight text-[var(--primary)] sm:text-base">
                            {formatUsdFromKhr(p.unit_price, khrPerUsd)}
                          </p>
                        </div>
                        <div
                          className="rounded-xl border border-black/[0.06] bg-[var(--page)] px-2 py-1.5 sm:rounded-2xl sm:px-3 sm:py-2"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (hasMod) {
                                onOpenItem(p, group.name);
                                return;
                              }
                              onAddSimple(p.id, qty + 1);
                              notifySuccess("Added to cart.");
                            }}
                            className="brand-primary-button flex w-full items-center justify-center rounded-full px-2 py-2 text-[11px] font-bold sm:px-4 sm:py-2.5 sm:text-sm"
                          >
                            {hasMod ? "Add to cart" : hasQty ? `Add again (${qty} in cart)` : "Add to cart"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
