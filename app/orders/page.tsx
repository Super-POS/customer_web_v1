"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AccountPageHeader } from "@/components/account-page-header";
import { SignInGate } from "@/components/sign-in-gate";
import { formatUsdFromKhr } from "@/lib/api";
import { useExchangeRate } from "@/contexts/exchange-rate-context";
import { useAuth } from "@/lib/auth-context";
import { fetchJson } from "@/lib/customer-fetch";
import { notifyError } from "@/lib/notify";

type OrderRow = {
  id: number;
  receipt_number: string;
  total_price?: number | null;
  status: string;
  is_paid?: boolean;
  channel?: string;
  ordered_at?: string | null;
};

function formatStatus(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OrdersPage() {
  const { khrPerUsd } = useExchangeRate();
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [pagination, setPagination] = useState({ totalPage: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const limit = 10;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const q = `/customer/orders?page=${page}&limit=${limit}`;
      const res = await fetchJson<{ data: OrderRow[]; pagination: typeof pagination }>(q, token);
      setRows(res.data ?? []);
      setPagination(res.pagination ?? { totalPage: 1, total: 0 });
    } catch (e) {
      setRows([]);
      notifyError(e instanceof Error ? e.message : "Could not load orders");
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client data fetch on mount / page change
    void load();
  }, [load]);

  return (
    <SignInGate>
      <div className="brand-page max-w-4xl">
        <AccountPageHeader
          title="Your orders"
          subtitle="Receipt numbers and status from the kitchen."
        />

        {loading ? (
          <div className="mt-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--border)_55%,white)]"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="brand-card mt-8 rounded-[1.75rem] border-dashed px-6 py-12 text-center text-sm text-[var(--text-muted)]">
            No orders yet.{" "}
            <Link href="/" className="font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)]">
              Browse the menu
            </Link>
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {rows.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="brand-card brand-card-hover flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[var(--text)]">#{o.receipt_number}</p>
                      {o.is_paid && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
                          Paid
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      {formatStatus(o.status)}
                      {o.channel ? ` · ${o.channel}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)] opacity-80">
                      {o.ordered_at ? new Date(o.ordered_at).toLocaleString() : "Scheduled"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums text-[var(--primary)]">
                      {formatUsdFromKhr(Number(o.total_price ?? 0), khrPerUsd)}
                    </p>
                    <span className="text-xs font-medium text-[var(--primary)]">View →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!loading && pagination.totalPage > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="brand-secondary-button rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-[var(--text-muted)]">
              Page {page} of {pagination.totalPage}
            </span>
            <button
              type="button"
              disabled={page >= pagination.totalPage}
              onClick={() => setPage((p) => p + 1)}
              className="brand-secondary-button rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </SignInGate>
  );
}
