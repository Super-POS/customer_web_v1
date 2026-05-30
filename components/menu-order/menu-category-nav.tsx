"use client";

import { useEffect, useRef, useState } from "react";
import type { MenuCategory } from "./types";

type Props = {
  menus: MenuCategory[];
};

export function MenuCategoryNav({ menus }: Props) {
  const [activeId, setActiveId] = useState<number | null>(() => menus[0]?.id ?? null);
  const pillsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menus.length === 0) return;
    if (!activeId && menus[0]) setActiveId(menus[0].id);

    const elemMap = new Map<Element, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = elemMap.get(entry.target);
            if (id != null) setActiveId(id);
          }
        });
      },
      { threshold: 0.15, rootMargin: "-15% 0px -65% 0px" },
    );

    menus.forEach((cat) => {
      const el = document.getElementById(`cat-${cat.id}`);
      if (el) {
        elemMap.set(el, cat.id);
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [menus, activeId]);

  // Keep the active pill visible in the mobile scroll container
  useEffect(() => {
    if (!activeId || !pillsRef.current) return;
    const btn = pillsRef.current.querySelector(`[data-id="${activeId}"]`) as HTMLElement | null;
    btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  const scrollTo = (id: number) => {
    const el = document.getElementById(`cat-${id}`);
    if (!el) return;
    setActiveId(id);
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    const offset = isDesktop ? 120 : 132;
    const y = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  if (!menus.length) return null;

  return (
    <>
      {/* ── Mobile: sticky horizontal pills ──────────────────────────────── */}
      <div className="lg:hidden sticky top-[4.75rem] z-30 -mx-4 sm:-mx-6 border-b border-[var(--border)] bg-[var(--page)]/95 backdrop-blur-md">
        <div
          ref={pillsRef}
          className="flex gap-2 overflow-x-auto px-4 py-2.5 sm:px-6"
          style={{ scrollbarWidth: "none" }}
        >
          {menus.map((cat) => {
            const active = activeId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                data-id={cat.id}
                onClick={() => scrollTo(cat.id)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                  active
                    ? "bg-[var(--primary)] text-white shadow-sm"
                    : "border border-[var(--border)] bg-transparent text-[var(--text-muted)] hover:border-[var(--primary)]/40 hover:text-[var(--text)]"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Desktop: fixed left panel, vertically centred ───────────────── */}
      <aside className="hidden lg:fixed lg:left-0 lg:top-1/2 lg:block lg:z-40 lg:-translate-y-1/2">
        <div
          className="w-52 rounded-r-2xl border border-l-0 border-[var(--border)] bg-[var(--page)]/92 py-4 pl-3 pr-3 shadow-[6px_0_28px_-10px_rgba(0,0,0,0.12)] backdrop-blur-xl"
          style={{ maxHeight: "calc(100vh - 10rem)", overflowY: "auto", scrollbarWidth: "none" }}
        >
          <p className="mb-3 px-2 text-[9px] font-bold uppercase tracking-[0.4em] text-[var(--text-muted)]">
            Categories
          </p>
          <div className="space-y-0.5">
            {menus.map((cat) => {
              const active = activeId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => scrollTo(cat.id)}
                  className={`group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-all duration-200 ${
                    active
                      ? "bg-[var(--primary)] text-white shadow-[0_4px_16px_-4px_color-mix(in_srgb,var(--primary)_35%,transparent)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--text)]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-200 ${
                      active
                        ? "bg-white"
                        : "bg-[var(--border)] group-hover:bg-[var(--primary)]"
                    }`}
                  />
                  <span className="flex-1 text-sm font-medium leading-snug">{cat.name}</span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-all ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-[var(--border)] text-[var(--text-muted)] group-hover:bg-[var(--primary-soft)]"
                    }`}
                  >
                    {cat.menus.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
