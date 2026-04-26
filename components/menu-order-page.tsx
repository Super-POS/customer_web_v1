"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { apiErrorMessage, formatRiel, getApiBaseUrl, getPublicMenuUrl, mediaUrl } from "@/lib/api";

type Product = {
  id: number;
  name: string;
  unit_price: number;
  code?: string;
  image?: string | null;
};

type ProductType = {
  id: number;
  name: string;
  products: Product[];
};

function QtyStepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const dec = () => onChange(Math.max(0, value - 1));
  const inc = () => onChange(value + 1);
  return (
    <div className="inline-flex items-center gap-0 rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value <= 0}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
      >
        −
      </button>
      <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums text-slate-900">{value}</span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-medium text-[var(--primary)] transition hover:bg-indigo-50 disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

export function MenuOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">Loading…</div>
      }
    >
      <AuthQuerySync />
      <MenuOrderInner />
    </Suspense>
  );
}

/** Opens auth modal when URL has ?auth=login|register (e.g. old bookmarks). */
function AuthQuerySync() {
  const params = useSearchParams();
  const { open } = useAuthModal();

  useEffect(() => {
    const a = params.get("auth");
    if (a === "login" || a === "register") open(a);
  }, [params, open]);

  return null;
}

function MenuOrderInner() {
  const { token, signOut, ready } = useAuth();
  const { openLogin, openRegister } = useAuthModal();
  const [menus, setMenus] = useState<ProductType[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [loadingMenus, setLoadingMenus] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const sectionRefs = useRef<Record<number, HTMLElement | null>>({});

  const base = getApiBaseUrl();

  const priceById = useMemo(() => {
    const m = new Map<number, number>();
    menus.forEach((g) => g.products.forEach((p) => m.set(p.id, p.unit_price)));
    return m;
  }, [menus]);

  const totalPrice = useMemo(
    () =>
      Object.entries(cart).reduce((sum, [id, qty]) => {
        const u = priceById.get(Number(id)) || 0;
        return sum + u * qty;
      }, 0),
    [cart, priceById],
  );

  const cartCount = useMemo(() => Object.values(cart).reduce((a, q) => a + q, 0), [cart]);

  const setQty = (productId: number, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) {
        const n = { ...prev };
        delete n[productId];
        return n;
      }
      return { ...prev, [productId]: qty };
    });
  };

  const loadMenus = useCallback(async () => {
    setFeedback(null);
    setLoadingMenus(true);
    try {
      const res = await fetch(getPublicMenuUrl());
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, "Could not load menu"));
      setMenus(data.data || []);
    } catch (e) {
      setMenus([]);
      setFeedback({
        type: "err",
        text: e instanceof Error ? e.message : "Could not load menu",
      });
    } finally {
      setLoadingMenus(false);
    }
  }, []);

  useEffect(() => {
    if (ready) loadMenus();
  }, [ready, loadMenus]);

  const placeOrder = async () => {
    const items = Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({ product_id: Number(id), quantity: q }));
    if (items.length === 0) {
      setFeedback({ type: "err", text: "Choose at least one item." });
      return;
    }
    if (!token) {
      setFeedback({ type: "err", text: "Sign in to place your order." });
      openLogin();
      return;
    }
    setFeedback(null);
    setPlacingOrder(true);
    try {
      const res = await fetch(`${base}/api/customer/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ channel: "website", cart: JSON.stringify(items) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiErrorMessage(data, "Order failed"));
      setCart({});
      setFeedback({ type: "ok", text: data?.message || "Order placed." });
    } catch (e) {
      setFeedback({ type: "err", text: e instanceof Error ? e.message : "Order failed" });
    } finally {
      setPlacingOrder(false);
    }
  };

  const scrollToCategory = (id: number) => {
    const el = sectionRefs.current[id];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-indigo-200 border-t-[var(--primary)]" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28 lg:pb-8">
      {!token && (
        <div className="border-b border-indigo-200/60 bg-indigo-50/90">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
            <p className="text-sm text-slate-800">
              <span className="font-semibold">Browsing the menu</span> — sign in to send your order.
            </p>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
              <button
                type="button"
                onClick={openLogin}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--primary-dark)]"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={openRegister}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Menu</h1>
            <p className="mt-1 text-sm text-slate-600">Add items with +. Cart stays on the right (or bottom on your phone).</p>
          </div>
          <button
            type="button"
            onClick={loadMenus}
            disabled={loadingMenus}
            className="self-start text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 sm:self-auto"
          >
            {loadingMenus ? "Refreshing…" : "Refresh menu"}
          </button>
        </div>
        {menus.length > 0 && (
          <div className="sticky top-16 z-30 border-t border-slate-100/80 bg-white/90 backdrop-blur-md">
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2 sm:px-6">
              {menus.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => scrollToCategory(g.id)}
                  className="shrink-0 rounded-full border border-slate-200/80 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-900"
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loadingMenus && !menus.length && (
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 sm:px-6">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 pt-6 lg:grid-cols-[1fr,340px] lg:items-start">
          <div className="space-y-10">
            {menus.map((group) => (
              <section
                key={group.id}
                id={`cat-${group.id}`}
                ref={(el) => {
                  sectionRefs.current[group.id] = el;
                }}
                className="scroll-mt-28"
              >
                <h2 className="mb-4 text-lg font-semibold text-slate-900 sm:text-xl">{group.name}</h2>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {group.products.map((p) => {
                    const img = mediaUrl(p.image);
                    const qty = cart[p.id] || 0;
                    return (
                      <li
                        key={p.id}
                        className="group flex overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md"
                      >
                        <div className="relative h-32 w-28 shrink-0 bg-slate-100 sm:h-36 sm:w-32">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-2xl text-slate-300">◇</div>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col justify-between p-3 sm:p-4">
                          <div>
                            <p className="line-clamp-2 font-medium leading-snug text-slate-900">{p.name}</p>
                            {p.code && <p className="mt-0.5 text-xs text-slate-500">{p.code}</p>}
                            <p className="mt-2 text-base font-bold tabular-nums text-[var(--primary)]">
                              {formatRiel(p.unit_price)} <span className="text-sm font-normal text-slate-500">៛</span>
                            </p>
                          </div>
                          <div className="mt-2 flex items-center justify-end">
                            <QtyStepper
                              value={qty}
                              onChange={(n) => setQty(p.id, n)}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Your order</h3>
              <p className="mt-1 text-xs text-slate-500">{cartCount} items</p>
              <div className="my-4 max-h-64 space-y-2 overflow-y-auto border-t border-b border-slate-100 py-3">
                {cartCount === 0 && <p className="text-sm text-slate-500">No items yet.</p>}
                {Object.entries(cart)
                  .filter(([, q]) => q > 0)
                  .map(([id, q]) => {
                    const name =
                      menus.flatMap((g) => g.products).find((x) => x.id === Number(id))?.name || `Item #${id}`;
                    const u = priceById.get(Number(id)) || 0;
                    return (
                      <div key={id} className="flex justify-between gap-2 text-sm">
                        <span className="line-clamp-1 text-slate-700">
                          {q}× {name}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums text-slate-800">{formatRiel(u * q)} ៛</span>
                      </div>
                    );
                  })}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-slate-600">Total</span>
                <span className="text-xl font-bold tabular-nums text-[var(--primary)]">
                  {formatRiel(totalPrice)} ៛
                </span>
              </div>
              <button
                type="button"
                onClick={placeOrder}
                disabled={placingOrder || cartCount === 0}
                className="mt-4 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
              >
                {placingOrder ? "Sending…" : token ? "Place order" : "Sign in to order"}
              </button>
              {token && (
                <button
                  type="button"
                  onClick={signOut}
                  className="mt-3 w-full text-center text-xs text-slate-500 hover:text-slate-800"
                >
                  Sign out
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 p-3 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-1">
          <div>
            <p className="text-xs text-slate-500">{cartCount} items</p>
            <p className="text-lg font-bold tabular-nums text-[var(--primary)]">{formatRiel(totalPrice)} ៛</p>
          </div>
          <button
            type="button"
            onClick={placeOrder}
            disabled={placingOrder || cartCount === 0}
            className="min-w-[9rem] rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {placingOrder ? "…" : token ? "Place order" : "Sign in"}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className="fixed bottom-24 left-4 right-4 z-50 sm:bottom-auto sm:left-1/2 sm:top-24 sm:right-auto sm:-translate-x-1/2 lg:bottom-8 lg:left-auto lg:right-8 lg:translate-x-0"
          role="status"
        >
          <div
            className={
              feedback.type === "ok"
                ? "rounded-xl border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-lg"
                : "rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-900 shadow-lg"
            }
          >
            {feedback.text}
          </div>
        </div>
      )}

    </div>
  );
}
