"use client";

import { Suspense } from "react";
import { AuthQuerySync } from "./auth-query-sync";
import { CoffeePlaceholder } from "./coffee-placeholder";
import { MenuCartSidebar } from "./menu-cart-sidebar";
import { MenuCategoryList } from "./menu-category-list";
import { MenuFloatingCart } from "./menu-floating-cart";
import { MenuOrderHero } from "./menu-hero";
import { MenuItemDetailSidebar } from "./menu-item-detail-sidebar";
import { MenuLoadingSkeleton } from "./menu-loading-skeleton";
import { MenuOrderInner } from "./menu-order-inner";
import { OrderCartPanel } from "./order-cart-panel";
import { QtyStepper } from "./qty-stepper";

export function MenuOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[55vh] flex-col items-center justify-center gap-5 text-[var(--text-muted)]">
          <span className="inline-flex h-12 w-12 animate-spin rounded-full border-2 border-[var(--page)] border-t-[var(--primary)]" />
          <p className="text-[13px] font-medium tracking-wide">Loading your menu…</p>
        </div>
      }
    >
      <AuthQuerySync />
      <MenuOrderInner />
    </Suspense>
  );
}

export const MenuOrder = {
  Page: MenuOrderPage,
  Inner: MenuOrderInner,
  Hero: MenuOrderHero,
  CategoryList: MenuCategoryList,
  LoadingSkeleton: MenuLoadingSkeleton,
  FloatingCart: MenuFloatingCart,
  CartSidebar: MenuCartSidebar,
  ItemDetailSidebar: MenuItemDetailSidebar,
  OrderCartPanel,
  QtyStepper,
  CoffeePlaceholder,
  AuthQuerySync,
} as const;

export type {
  CartLine,
  ItemDetailState,
  MenuCategory,
  MenuItem,
  MenuSizeItem,
  MenuSizeKey,
  ModifierGroupItem,
  ModifierOptionItem,
} from "./types";
export { addOrMergeCartLine, cartLineKey, loadPersistedCartLines, persistCartLines, setCartLineQty, totalQtyForMenu } from "./cart";
export {
  defaultSizeForItem,
  findMenuById,
  lineUnitPrice,
  lowestSizePrice,
  menuHasModifiers,
  menuHasSizes,
  previewCouponDiscount,
  priceForSize,
  sortedModifierGroups,
  sortedSizes,
} from "./menu-helpers";
