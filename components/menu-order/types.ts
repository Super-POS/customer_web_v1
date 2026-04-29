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

export type MenuItem = {
  id: number;
  name: string;
  unit_price: number;
  code?: string;
  image?: string | null;
  modifierGroups?: ModifierGroupItem[];
};

export type CartLine = {
  menu_id: number;
  quantity: number;
  modifier_option_ids: number[];
};

export type MenuCategory = {
  id: number;
  name: string;
  menus: MenuItem[];
};

export type ItemDetailState = { item: MenuItem; categoryName: string };
