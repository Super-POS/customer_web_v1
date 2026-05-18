import { normalizeModifierIds } from "./cart";
import type {
  MenuCategory,
  MenuItem,
  MenuSizeItem,
  MenuSizeKey,
  ModifierGroupItem,
  ModifierOptionItem,
} from "./types";

export function parsePriceDelta(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function numericPrice(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const SIZE_ORDER: Record<MenuSizeKey, number> = { S: 0, M: 1, L: 2 };

export function menuHasSizes(item: MenuItem | undefined | null): boolean {
  if (!item) return false;
  if (item.has_sizes !== undefined) return Boolean(item.has_sizes) && (item.sizes?.length ?? 0) > 0;
  return (item.sizes?.length ?? 0) > 0;
}

export function sortedSizes(item: MenuItem | undefined | null): MenuSizeItem[] {
  if (!item?.sizes?.length) return [];
  return [...item.sizes].sort((a, b) => (SIZE_ORDER[a.size] ?? 99) - (SIZE_ORDER[b.size] ?? 99));
}

export function defaultSizeForItem(item: MenuItem | undefined | null): MenuSizeKey | undefined {
  const list = sortedSizes(item);
  if (list.length === 0) return undefined;
  const m = list.find((s) => s.size === "M");
  return (m ?? list[0]).size;
}

export function priceForSize(item: MenuItem | undefined | null, size: MenuSizeKey | undefined | null): number {
  if (!item || !size) return 0;
  const row = (item.sizes ?? []).find((s) => s.size === size);
  return row ? numericPrice(row.price) : 0;
}

export function lowestSizePrice(item: MenuItem | undefined | null): number {
  const list = sortedSizes(item);
  if (list.length === 0) return 0;
  let min = Number.POSITIVE_INFINITY;
  for (const s of list) {
    const p = numericPrice(s.price);
    if (p > 0 && p < min) min = p;
  }
  return Number.isFinite(min) ? min : numericPrice(list[0].price);
}

export function getModifierGroupMeta(g: ModifierGroupItem): { sortOrder: number; isRequired: boolean } {
  const t = g.MenuModifierGroup ?? g.menuModifierGroup;
  return {
    sortOrder: Number(t?.sort_order ?? 0),
    isRequired: Boolean(t?.is_required ?? false),
  };
}

export function sortedModifierGroups(item: MenuItem): ModifierGroupItem[] {
  const gs = item.modifierGroups;
  if (!gs?.length) return [];
  return [...gs].sort((a, b) => getModifierGroupMeta(a).sortOrder - getModifierGroupMeta(b).sortOrder);
}

export function menuHasModifiers(item: MenuItem): boolean {
  return sortedModifierGroups(item).some((g) => (g.options?.length ?? 0) > 0);
}

/**
 * Compute the unit price for a cart line / detail view.
 *
 * Sized items keep their per-size prices on `menu.sizes`; their `unit_price`
 * column is often 0. When `size` is provided we read the size price, otherwise
 * we fall back to the cheapest size (used for "from $X" labels on the list).
 */
export function lineUnitPrice(
  menu: MenuItem | undefined | null,
  modifierIds: number[],
  size?: MenuSizeKey | null,
): number {
  if (!menu) return 0;
  let base: number;
  if (menuHasSizes(menu)) {
    base = size ? priceForSize(menu, size) : lowestSizePrice(menu);
  } else {
    base = numericPrice(menu.unit_price);
  }
  const optById = new Map<number, ModifierOptionItem>();
  for (const g of sortedModifierGroups(menu)) {
    for (const o of g.options || []) {
      optById.set(o.id, o);
    }
  }
  let delta = 0;
  for (const id of modifierIds) {
    const o = optById.get(id);
    if (o) delta += parsePriceDelta(o.price_delta);
  }
  return base + delta;
}

export function modifierSummaryText(menu: MenuItem | undefined, modifierIds: number[]): string {
  if (!menu || modifierIds.length === 0) return "";
  const optById = new Map<number, string>();
  for (const g of sortedModifierGroups(menu)) {
    for (const o of g.options || []) {
      optById.set(o.id, o.label);
    }
  }
  const labels = modifierIds.map((id) => optById.get(id)).filter(Boolean) as string[];
  if (!labels.length) return "";
  return labels.join(" · ");
}

export function findMenuById(menus: MenuCategory[], id: number): MenuItem | undefined {
  for (const g of menus) {
    const m = g.menus.find((x) => x.id === id);
    if (m) return m;
  }
  return undefined;
}

/** Matches cashier/API rounding: percent of subtotal, capped at subtotal. */
export function previewCouponDiscount(subtotal: number, discountPercent: number): number {
  const base = Number(subtotal);
  const pct = Number(discountPercent);
  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(pct) || pct <= 0) {
    return 0;
  }
  const d = Math.round((base * pct) / 100);
  return Math.min(d, base);
}

export function initialModifierSelections(item: MenuItem): Record<number, number | null> {
  const sel: Record<number, number | null> = {};
  for (const g of sortedModifierGroups(item)) {
    const opts = [...(g.options || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    if (opts.length === 0) continue;
    const { isRequired } = getModifierGroupMeta(g);
    const def = opts.find((o) => o.is_default);
    sel[g.id] = def?.id ?? (isRequired ? opts[0]?.id ?? null : null);
  }
  return sel;
}

export function selectionsToModifierIds(item: MenuItem, sel: Record<number, number | null>): number[] {
  const ids: number[] = [];
  for (const g of sortedModifierGroups(item)) {
    const v = sel[g.id];
    if (v != null && Number.isFinite(v)) ids.push(Number(v));
  }
  return normalizeModifierIds(ids);
}

export function validateModifierSelections(item: MenuItem, sel: Record<number, number | null>): string | null {
  for (const g of sortedModifierGroups(item)) {
    const opts = g.options || [];
    if (opts.length === 0) continue;
    const { isRequired } = getModifierGroupMeta(g);
    const v = sel[g.id];
    if (isRequired && (v == null || !Number.isFinite(Number(v)))) {
      return `Please choose ${g.name}.`;
    }
  }
  return null;
}
