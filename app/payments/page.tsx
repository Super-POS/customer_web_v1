"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AccountPageHeader } from "@/components/account-page-header";
import { SignInGate } from "@/components/sign-in-gate";
import { formatRiel } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { fetchJson } from "@/lib/customer-fetch";
import { notifyError } from "@/lib/notify";
import { CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY } from "@/lib/customer-web-flags";

type PaymentRow = {
  id: number;
  amount: number;
  method: string;
  status: string;
  order?: { id: number; receipt_number?: string; total_price?: number; status?: string };
  created_at?: string;
};

export default function PaymentsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPage: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const limit = 10;

  const load = useCallback(async () => {
    if (!token || CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY) return;
    setLoading(true);
    try {
      const res = await fetchJson<{
        data: PaymentRow[];
        pagination: { totalPage: number; total: number };
      }>(`/customer/payments/history?page=${page}&limit=${limit}`, token);
      setRows(res.data ?? []);
      setPagination(res.pagination ?? { totalPage: 1, total: 0 });
    } catch (e) {
      setRows([]);
      notifyError(e instanceof Error ? e.message : "Could not load payments");
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client data fetch on mount / page change
    void load();
  }, [load]);

  useEffect(() => {
    if (CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY) router.replace("/");
  }, [router]);

  if (CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">Redirecting…</p>
      </div>
    );
  }

  return (
    <SignInGate>
      <div className="brand-page max-w-4xl">
        <AccountPageHeader
          title="Payments"
          subtitle="History of payment attempts linked to your orders."
        />

        {loading ? (
          <div className="mt-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--border)_55%,white)]"
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="brand-card mt-8 rounded-[1.75rem] border-dashed px-6 py-12 text-center text-sm text-[var(--text-muted)]">
            No payments recorded yet. Pay from an{" "}
            <Link href="/orders" className="font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)]">
              order detail
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {rows.map((tx) => (
              <li
                key={tx.id}
                className="brand-card brand-card-hover flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-4"
              >
                <div>
                  <p className="font-semibold capitalize text-[var(--text)]">{tx.method}</p>
                  <p className="text-xs capitalize text-[var(--text-muted)]">{tx.status}</p>
                  {tx.order?.id != null && (
                    <Link
                      href={`/orders/${tx.order.id}`}
                      className="mt-1 inline-block text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-dark)]"
                    >
                      Order #{tx.order.receipt_number ?? tx.order.id}
                    </Link>
                  )}
                  {tx.created_at && (
                    <p className="mt-1 text-xs text-[var(--text-muted)] opacity-85">{new Date(tx.created_at).toLocaleString()}</p>
                  )}
                </div>
                <p className="text-lg font-bold tabular-nums text-[var(--primary)]">
                  {formatRiel(Number(tx.amount))} ៛
                </p>
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
              Page {page} / {pagination.totalPage}
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
