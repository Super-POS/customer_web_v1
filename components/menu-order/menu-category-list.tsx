import { formatRiel, mediaUrl } from "@/lib/api";
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
  return (
    <div
      id="menu-list"
      className="mx-auto max-w-6xl scroll-mt-28 sm:scroll-mt-32 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] max-[380px]:pl-3 max-[380px]:pr-3 sm:pl-6 sm:pr-6"
    >
      <div className="space-y-12 pt-8 sm:space-y-16 sm:pt-10 lg:pt-12">
        {menus.map((group) => (
          <section key={group.id} id={`cat-${group.id}`} className="scroll-mt-24 sm:scroll-mt-28">
            <header className="mb-6 border-l-[4px] border-[var(--primary)] pl-4 sm:mb-8 sm:pl-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[var(--text-muted)]">Menu</p>
              <h2 className="mt-1.5 font-[family-name:var(--font-oswald)] text-[clamp(1.35rem,3.5vw+0.65rem,1.75rem)] font-semibold tracking-tight text-[var(--text)]">
                {group.name}
              </h2>
            </header>
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-7 xl:grid-cols-3">
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
                      className={`brand-card-hover brand-card group flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.75rem] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${
                        hasQty ? "ring-2 ring-[var(--primary)]/45 shadow-[0_12px_36px_-14px_color-mix(in_srgb,var(--primary)_28%,transparent)]" : ""
                      }`}
                    >
                      <div className="relative aspect-[5/4] w-full overflow-hidden bg-[var(--page)]">
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
                            <CoffeePlaceholder className="h-16 w-16 text-[var(--text-muted)] opacity-40" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                        <div>
                          <p className="font-[family-name:var(--font-oswald)] text-lg font-semibold leading-snug text-[var(--text)]">{p.name}</p>
                          {p.code && (
                            <p className="mt-1.5 font-mono text-[11px] tracking-[0.08em] text-[var(--text-muted)]">{p.code}</p>
                          )}
                          <p className="mt-3 text-xl font-bold tabular-nums tracking-tight text-[var(--primary)]">
                            {formatRiel(p.unit_price)} <span className="text-sm font-medium text-[var(--text-muted)]">៛</span>
                          </p>
                        </div>
                        <div
                          className="rounded-2xl border border-black/[0.06] bg-[var(--page)] px-3 py-2"
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
                            className="brand-primary-button flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-bold"
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
