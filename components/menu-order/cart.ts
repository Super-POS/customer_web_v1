import type { CartLine, MenuSizeKey } from "./types";

export function normalizeModifierIds(ids: number[]): number[] {
  return [...new Set(ids.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0))].sort((a, b) => a - b);
}

function normalizeSize(size: MenuSizeKey | undefined | null): MenuSizeKey | "" {
  return size === "S" || size === "M" || size === "L" ? size : "";
}

export function cartLineKey(
  menuId: number,
  modifierIds: number[],
  size?: MenuSizeKey | null,
): string {
  const s = normalizeModifierIds(modifierIds);
  return `${menuId}|${normalizeSize(size)}|${s.join(",")}`;
}

const MENU_CART_STORAGE_KEY_V2 = "club54-order-cart-v2";
const MENU_CART_STORAGE_KEY_V1 = "club54-order-cart-v1";

function isCartLineRow(x: unknown): x is CartLine {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const mid = Number(o.menu_id);
  const qty = Number(o.quantity);
  if (!Number.isFinite(mid) || mid <= 0 || !Number.isFinite(qty) || qty <= 0) return false;
  if (!Array.isArray(o.modifier_option_ids)) return false;
  for (const n of o.modifier_option_ids) {
    const id = Number(n);
    if (!Number.isFinite(id) || id <= 0) return false;
  }
  return true;
}

function readSize(raw: unknown): MenuSizeKey | undefined {
  return raw === "S" || raw === "M" || raw === "L" ? raw : undefined;
}

function sanitizePersistedCartLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const out: CartLine[] = [];
  for (const x of raw) {
    if (!isCartLineRow(x)) continue;
    const size = readSize((x as { size?: unknown }).size);
    const line: CartLine = {
      menu_id: Math.floor(Number(x.menu_id)),
      quantity: Math.floor(Number(x.quantity)),
      modifier_option_ids: normalizeModifierIds(x.modifier_option_ids as number[]),
    };
    if (size) line.size = size;
    out.push(line);
  }
  return out;
}

function migrateV1QuantityMap(raw: unknown): CartLine[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const out: CartLine[] = [];
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const menu_id = Number(k);
    const qty = typeof v === "number" ? Math.floor(v) : Number(v);
    if (!Number.isFinite(menu_id) || menu_id <= 0 || !Number.isFinite(qty) || qty <= 0) continue;
    out.push({ menu_id, quantity: qty, modifier_option_ids: [] });
  }
  return out;
}

export function loadPersistedCartLines(): CartLine[] {
  try {
    const v2 = localStorage.getItem(MENU_CART_STORAGE_KEY_V2);
    if (v2 !== null) {
      const parsed = JSON.parse(v2) as unknown;
      return sanitizePersistedCartLines(parsed);
    }
    const v1 = localStorage.getItem(MENU_CART_STORAGE_KEY_V1);
    if (v1) {
      return migrateV1QuantityMap(JSON.parse(v1) as unknown);
    }
  } catch {
    /* corrupt storage */
  }
  return [];
}

export function persistCartLines(lines: CartLine[]): void {
  try {
    if (lines.length === 0) {
      localStorage.removeItem(MENU_CART_STORAGE_KEY_V2);
      localStorage.removeItem(MENU_CART_STORAGE_KEY_V1);
      return;
    }
    localStorage.setItem(MENU_CART_STORAGE_KEY_V2, JSON.stringify(lines));
    localStorage.removeItem(MENU_CART_STORAGE_KEY_V1);
  } catch {
    /* quota / private mode */
  }
}

export function addOrMergeCartLine(lines: CartLine[], line: CartLine): CartLine[] {
  const mods = normalizeModifierIds(line.modifier_option_ids);
  const size = readSize(line.size);
  const key = cartLineKey(line.menu_id, mods, size ?? null);
  const idx = lines.findIndex((l) => cartLineKey(l.menu_id, l.modifier_option_ids, l.size ?? null) === key);
  if (idx < 0) {
    const next: CartLine = {
      menu_id: line.menu_id,
      modifier_option_ids: mods,
      quantity: Math.floor(line.quantity),
    };
    if (size) next.size = size;
    return [...lines, next];
  }
  const out = [...lines];
  out[idx] = {
    ...out[idx],
    quantity: Math.floor(out[idx].quantity + line.quantity),
  };
  return out;
}

export function setCartLineQty(
  lines: CartLine[],
  menuId: number,
  modifierIds: number[],
  qty: number,
  size?: MenuSizeKey | null,
): CartLine[] {
  const mods = normalizeModifierIds(modifierIds);
  const sz = readSize(size);
  const key = cartLineKey(menuId, mods, sz ?? null);
  const idx = lines.findIndex((l) => cartLineKey(l.menu_id, l.modifier_option_ids, l.size ?? null) === key);
  if (qty <= 0) {
    if (idx < 0) return lines;
    return lines.filter((_, i) => i !== idx);
  }
  if (idx < 0) {
    const next: CartLine = { menu_id: menuId, quantity: Math.floor(qty), modifier_option_ids: mods };
    if (sz) next.size = sz;
    return [...lines, next];
  }
  const next = [...lines];
  next[idx] = { ...next[idx], quantity: Math.floor(qty) };
  return next;
}

export function totalQtyForMenu(lines: CartLine[], menuId: number): number {
  return lines.filter((l) => l.menu_id === menuId).reduce((s, l) => s + l.quantity, 0);
}

export function simpleLineQty(lines: CartLine[], menuId: number): number {
  const line = lines.find(
    (l) => l.menu_id === menuId && l.modifier_option_ids.length === 0 && !l.size,
  );
  return line ? line.quantity : 0;
}
