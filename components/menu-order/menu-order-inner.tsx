"use client";

import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { apiErrorMessage, apiUrl, getPublicMenuUrl } from "@/lib/api";
import { fetchJson } from "@/lib/customer-fetch";
import { notify, notifyError, notifyInfo } from "@/lib/notify";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadPersistedCartLines, persistCartLines, setCartLineQty as applyCartLineQty } from "./cart";
import { MenuCartSidebar } from "./menu-cart-sidebar";
import { MenuCategoryList } from "./menu-category-list";
import { MenuFloatingCart } from "./menu-floating-cart";
import { MenuOrderHero } from "./menu-hero";
import { MenuItemDetailSidebar } from "./menu-item-detail-sidebar";
import { MenuLoadingSkeleton } from "./menu-loading-skeleton";
import {
  findMenuById,
  initialModifierSelections,
  lineUnitPrice,
  menuHasModifiers,
  previewCouponDiscount,
} from "./menu-helpers";
import type { CartLine, ItemDetailState, MenuCategory, MenuItem } from "./types";

export function MenuOrderInner() {
  const { token, ready, isTelegramWebApp, authError } = useAuth();
  const { openLogin } = useAuthModal();
  const [menus, setMenus] = useState<MenuCategory[]>([]);
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [activeItemDetail, setActiveItemDetail] = useState<ItemDetailState | null>(null);
  const [cartSidebarOpen, setCartSidebarOpen] = useState(false);
  const [modifierSelections, setModifierSelections] = useState<Record<number, number | null>>({});
  const [detailModifierQty, setDetailModifierQty] = useState(1);
  const [couponOptions, setCouponOptions] = useState<{ code: string; discount_percent: number }[]>([]);
  const [couponCodeInput, setCouponCodeInput] = useState("");

  useEffect(() => {
    const lines = loadPersistedCartLines();
    if (lines.length > 0) setCartLines(lines);
  }, []);

  useEffect(() => {
    persistCartLines(cartLines);
  }, [cartLines]);

  const openItemDetail = useCallback((item: MenuItem, categoryName: string) => {
    if (menuHasModifiers(item)) {
      setModifierSelections(initialModifierSelections(item));
      setDetailModifierQty(1);
    }
    setActiveItemDetail({ item, categoryName });
  }, []);

  const totalPrice = useMemo(
    () =>
      cartLines.reduce((sum, line) => {
        const menu = findMenuById(menus, line.menu_id);
        const u = lineUnitPrice(menu, line.modifier_option_ids, line.size ?? null);
        return sum + u * line.quantity;
      }, 0),
    [cartLines, menus],
  );

  const cartCount = useMemo(() => cartLines.reduce((a, l) => a + l.quantity, 0), [cartLines]);

  const matchedActiveCoupon = useMemo(() => {
    const key = couponCodeInput.trim().toUpperCase();
    if (!key) {
      return null;
    }
    return couponOptions.find((x) => x.code === key) ?? null;
  }, [couponCodeInput, couponOptions]);

  const payableTotal = useMemo(() => {
    if (!matchedActiveCoupon || !token) {
      return totalPrice;
    }
    return Math.max(0, totalPrice - previewCouponDiscount(totalPrice, matchedActiveCoupon.discount_percent));
  }, [totalPrice, matchedActiveCoupon, token]);

  useEffect(() => {
    if (!cartSidebarOpen || !token) {
      return;
    }
    let cancelled = false;
    void fetchJson<{ data: { code: string; discount_percent: number }[] }>("/customer/orders/coupons", token)
      .then((res) => {
        if (!cancelled) {
          setCouponOptions(res.data ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCouponOptions([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cartSidebarOpen, token]);

  const setLineQty = (
    menuId: number,
    modifierIds: number[],
    qty: number,
    size?: import("./types").MenuSizeKey | null,
  ) => {
    setCartLines((prev) => applyCartLineQty(prev, menuId, modifierIds, qty, size ?? null));
  };

  const setQtySimple = (productId: number, qty: number) => {
    setCartLines((prev) => applyCartLineQty(prev, productId, [], qty, null));
  };

  const loadMenus = useCallback(async () => {
    setLoadingMenus(true);
    try {
      const res = await fetch(getPublicMenuUrl());
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, "Could not load menu"));
      setMenus(data.data || []);
    } catch (e) {
      setMenus([]);
      notifyError(e instanceof Error ? e.message : "Could not load menu");
    } finally {
      setLoadingMenus(false);
    }
  }, []);

  useEffect(() => {
    void loadMenus();
  }, [loadMenus]);

  useEffect(() => {
    if (!activeItemDetail && !cartSidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setActiveItemDetail(null);
      setCartSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeItemDetail, cartSidebarOpen]);

  useEffect(() => {
    if (activeItemDetail || cartSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeItemDetail, cartSidebarOpen]);

  const placeOrder = async () => {
    const items = cartLines
      .filter((l) => l.quantity > 0)
      .map((l) => ({
        product_id: l.menu_id,
        quantity: l.quantity,
        modifier_option_ids: l.modifier_option_ids,
        ...(l.size ? { size: l.size } : {}),
      }));
    if (items.length === 0) {
      notifyError("Choose at least one item.");
      return;
    }
    if (!token) {
      if (isTelegramWebApp && !ready) {
        notifyInfo("Signing in with Telegram… try again in a moment.");
        return;
      }
      if (isTelegramWebApp && ready) {
        notifyError(
          authError?.trim() ||
            "Telegram session is not available. Open Club54 again from the bot.",
        );
        return;
      }
      notifyError("Sign in to place your order.");
      openLogin();
      return;
    }
    setPlacingOrder(true);
    try {
      const res = await fetch(apiUrl("/customer/orders"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key":
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `order-${Math.random().toString(36).slice(2)}`,
        },
        body: JSON.stringify({
          channel: "website",
          cart: JSON.stringify(items),
          ...(couponCodeInput.trim()
            ? { coupon_code: couponCodeInput.trim().toUpperCase() }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, "Order failed"));
      setCartLines([]);
      setCouponCodeInput("");
      setCartSidebarOpen(false);
      notify({ type: "ok", text: data?.message || "Order placed." });
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Order failed");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="pb-[max(7rem,calc(5rem+env(safe-area-inset-bottom)),calc(5rem+var(--tg-safe-area-inset-bottom,0px)))] lg:pb-12">
      <MenuOrderHero />

      {loadingMenus && !menus.length ? <MenuLoadingSkeleton /> : null}

      <MenuCategoryList menus={menus} cartLines={cartLines} onOpenItem={openItemDetail} onAddSimple={setQtySimple} />

      <MenuFloatingCart
        cartCount={cartCount}
        totalPrice={couponCodeInput.trim() ? payableTotal : totalPrice}
        onOpen={() => setCartSidebarOpen(true)}
      />

      <MenuCartSidebar
        open={cartSidebarOpen}
        onClose={() => setCartSidebarOpen(false)}
        menus={menus}
        cartLines={cartLines}
        cartCount={cartCount}
        subtotal={totalPrice}
        payableTotal={payableTotal}
        placingOrder={placingOrder}
        token={token}
        placeOrder={placeOrder}
        setLineQty={setLineQty}
        couponCodeInput={couponCodeInput}
        onCouponCodeInputChange={setCouponCodeInput}
        matchedActiveCoupon={matchedActiveCoupon}
      />

      {activeItemDetail ? (
        <MenuItemDetailSidebar
          active={activeItemDetail}
          onClose={() => setActiveItemDetail(null)}
          cartLines={cartLines}
          setCartLines={setCartLines}
          modifierSelections={modifierSelections}
          setModifierSelections={setModifierSelections}
          detailModifierQty={detailModifierQty}
          setDetailModifierQty={setDetailModifierQty}
          setQtySimple={setQtySimple}
        />
      ) : null}
    </div>
  );
}
