import { formatRiel, mediaUrl } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/notify";
import { addOrMergeCartLine, simpleLineQty } from "./cart";
import { CoffeePlaceholder } from "./coffee-placeholder";
import { IconClose } from "./icons";
import {
  getModifierGroupMeta,
  lineUnitPrice,
  menuHasModifiers,
  parsePriceDelta,
  selectionsToModifierIds,
  sortedModifierGroups,
  validateModifierSelections,
} from "./menu-helpers";
import { QtyStepper } from "./qty-stepper";
import type { CartLine, ItemDetailState } from "./types";
import type { Dispatch, SetStateAction } from "react";

export type MenuItemDetailSidebarProps = {
  active: ItemDetailState;
  onClose: () => void;
  cartLines: CartLine[];
  setCartLines: Dispatch<SetStateAction<CartLine[]>>;
  modifierSelections: Record<number, number | null>;
  setModifierSelections: Dispatch<SetStateAction<Record<number, number | null>>>;
  detailModifierQty: number;
  setDetailModifierQty: Dispatch<SetStateAction<number>>;
  setQtySimple: (productId: number, qty: number) => void;
};

export function MenuItemDetailSidebar({
  active,
  onClose,
  cartLines,
  setCartLines,
  modifierSelections,
  setModifierSelections,
  detailModifierQty,
  setDetailModifierQty,
  setQtySimple,
}: MenuItemDetailSidebarProps) {
  const item = active.item;

  return (
    <div className="fixed inset-0 z-[80]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--text)_42%,transparent)] backdrop-blur-[2px]"
        aria-label="Close item details"
        onClick={onClose}
      />
      <aside
        className="tg-item-detail-sidebar absolute inset-y-0 right-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-md flex-col bg-[var(--surface)] shadow-[-18px_0_60px_-22px_rgba(34,34,33,0.45)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-item-detail-title"
      >
        <div className="tg-item-detail-sidebar-top flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 pt-[max(1rem,env(safe-area-inset-top),var(--tg-safe-area-inset-top,0px))] sm:px-5 sm:py-5">
          <p className="tg-drawer-eyebrow text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--primary)]">{active.categoryName}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[var(--page)] hover:text-[var(--text)]"
            aria-label="Close"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <div className="tg-item-detail-sidebar-body min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-8 pt-5 sm:px-5">
          <div className="overflow-hidden rounded-2xl bg-[var(--page)] ring-1 ring-black/[0.06]">
            <div className="relative aspect-[5/4] w-full tg-item-detail-photo">
              {mediaUrl(item.image) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaUrl(item.image)!} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-[200px] items-center justify-center tg-item-detail-photo-placeholder">
                  <CoffeePlaceholder className="h-20 w-20 text-[var(--text-muted)] opacity-35" />
                </div>
              )}
            </div>
          </div>

          <h2
            id="menu-item-detail-title"
            className="mt-6 font-[family-name:var(--font-oswald)] text-2xl font-semibold leading-tight tracking-tight text-[var(--text)]"
          >
            {item.name}
          </h2>
          {item.code && <p className="mt-2 font-mono text-[12px] tracking-[0.06em] text-[var(--text-muted)]">{item.code}</p>}
          <p className="mt-4 text-2xl font-bold tabular-nums text-[var(--primary)]">
            {menuHasModifiers(item) ? (
              <>
                {formatRiel(lineUnitPrice(item, selectionsToModifierIds(item, modifierSelections)))}{" "}
                <span className="text-base font-medium text-[var(--text-muted)]">៛</span>{" "}
                <span className="text-sm font-normal text-[var(--text-muted)]">each</span>
                <span className="block pt-1 text-sm font-normal text-[var(--text-muted)]">
                  Base {formatRiel(item.unit_price)} ៛ plus selected options
                </span>
              </>
            ) : (
              <>
                {formatRiel(item.unit_price)} <span className="text-base font-medium text-[var(--text-muted)]">៛</span>{" "}
                <span className="text-sm font-normal text-[var(--text-muted)]">each</span>
              </>
            )}
          </p>

          {menuHasModifiers(item) ? (
            <div className="mt-8 space-y-6">
              {sortedModifierGroups(item).map((g) => {
                const opts = [...(g.options || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                if (opts.length === 0) return null;
                const req = getModifierGroupMeta(g).isRequired;
                const sel = modifierSelections[g.id];
                return (
                  <div key={g.id} className="rounded-2xl border border-[var(--border)] bg-[var(--page)] p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                      {g.name}
                      {req ? <span className="text-red-600"> *</span> : null}
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                      {opts.map((opt) => {
                        const delta = parsePriceDelta(opt.price_delta);
                        const checked = sel === opt.id;
                        return (
                          <label
                            key={opt.id}
                            className="flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-[13px] transition hover:bg-black/[0.04] has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
                          >
                            <input
                              type="radio"
                              name={`mod-group-${g.id}`}
                              className="h-4 w-4 shrink-0 accent-[var(--primary)]"
                              checked={checked}
                              onChange={() =>
                                setModifierSelections((prev) => ({
                                  ...prev,
                                  [g.id]: opt.id,
                                }))
                              }
                            />
                            <span className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 text-[var(--text)]">
                              <span>{opt.label}</span>
                              {delta !== 0 ? (
                                <span className="shrink-0 tabular-nums text-[var(--text-muted)]">
                                  {delta > 0 ? "+" : ""}
                                  {formatRiel(delta)} ៛
                                </span>
                              ) : null}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--page)] p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">Quantity</p>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <QtyStepper value={detailModifierQty} min={1} onChange={setDetailModifierQty} />
                </div>
                <p className="mt-5 border-t border-[var(--border)] pt-4 text-[13px] text-[var(--text-muted)]">
                  Line total:{" "}
                  <span className="font-bold tabular-nums text-[var(--text)]">
                    {formatRiel(lineUnitPrice(item, selectionsToModifierIds(item, modifierSelections)) * detailModifierQty)} ៛
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const err = validateModifierSelections(item, modifierSelections);
                    if (err) {
                      notifyError(err);
                      return;
                    }
                    const ids = selectionsToModifierIds(item, modifierSelections);
                    setCartLines((prev) =>
                      addOrMergeCartLine(prev, {
                        menu_id: item.id,
                        quantity: detailModifierQty,
                        modifier_option_ids: ids,
                      }),
                    );
                    notifySuccess("Added to cart.");
                    onClose();
                  }}
                  className="brand-primary-button mt-5 flex w-full items-center justify-center rounded-full py-3.5 text-[14px] font-bold"
                >
                  Add to cart
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--page)] p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">Quantity</p>
              <div className="mt-4 flex items-center justify-between gap-4">
                <QtyStepper value={simpleLineQty(cartLines, item.id)} onChange={(n) => setQtySimple(item.id, n)} />
              </div>
              <p className="mt-5 border-t border-[var(--border)] pt-4 text-[13px] text-[var(--text-muted)]">
                Line total:{" "}
                <span className="font-bold tabular-nums text-[var(--text)]">
                  {formatRiel(lineUnitPrice(item, []) * simpleLineQty(cartLines, item.id))} ៛
                </span>
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
