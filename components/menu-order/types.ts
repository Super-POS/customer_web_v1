export type ModifierOptionItem = {
  id: number;
  label: string;
  price_delta?: number | string;
  sort_order?: number;
  is_default?: boolean;
};

export type ModifierGroupItem = {
  id: number;
  name: string;
  options?: ModifierOptionItem[];
  MenuModifierGroup?: { sort_order?: number; is_required?: boolean };
  menuModifierGroup?: { sort_order?: number; is_required?: boolean };
};

export type MenuSizeKey = "S" | "M" | "L";

export type MenuSizeItem = {
  id: number;
  size: MenuSizeKey;
  price: number | string;
};

export type MenuItem = {
  id: number;
  name: string;
  /** Base price for items without size variants. For sized items this may be 0; read `sizes` instead. */
  unit_price: number;
  /** When `true`, the customer must pick one of `sizes` and the cart line carries that size. */
  has_sizes?: boolean;
  sizes?: MenuSizeItem[];
  code?: string;
  image?: string | null;
  modifierGroups?: ModifierGroupItem[];
};

export type CartLine = {
  menu_id: number;
  quantity: number;
  modifier_option_ids: number[];
  /** Set only when the menu item `has_sizes`. Matches the cashier API contract. */
  size?: MenuSizeKey;
};

export type MenuCategory = {
  id: number;
  name: string;
  menus: MenuItem[];
};

export type ItemDetailState = { item: MenuItem; categoryName: string };
