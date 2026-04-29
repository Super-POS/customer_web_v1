import { normalizeModifierIds } from "./cart";
import type { MenuCategory, MenuItem, ModifierGroupItem, ModifierOptionItem } from "./types";

export function parsePriceDelta(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
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

export function lineUnitPrice(menu: MenuItem | undefined, modifierIds: number[]): number {
  if (!menu) return 0;
  const base = Number(menu.unit_price ?? 0);
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
