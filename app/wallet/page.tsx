"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignInGate } from "@/components/sign-in-gate";
// import { BarayDepositModal } from "@/components/payments/baray-deposit-modal";
import { formatUsdFromKhr } from "@/lib/api";
// import { pollCustomerBarayDepositState } from "@/lib/baray-client";
import { useExchangeRate } from "@/contexts/exchange-rate-context";
import { useAuth } from "@/lib/auth-context";
import { fetchJson } from "@/lib/customer-fetch";
import {
  CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY,
  CUSTOMER_WEB_WALLET_DEPOSIT_ENABLED,
} from "@/lib/customer-web-flags";
import { formatWalletTxStatus } from "@/lib/wallet-tx-label";

type WalletTx = {
  id: number;
  amount: number;
  type?: string;
  status?: string;
  reference?: string | null;
  note?: string | null;
  created_at?: string;
};

function formatTxText(value?: string): string {
  if (!value) return "Pending";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusBadgeClass(status?: string): string {
  const s = String(status ?? "").toLowerCase();
  if (s === "approved" || s === "paid" || s === "completed") {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  }
  if (s === "rejected" || s === "failed" || s === "cancelled") {
    return "bg-red-50 text-red-800 ring-red-200";
  }
  return "bg-[var(--primary-soft)] text-[var(--primary-dark)] ring-[var(--border)]";
}

export default function WalletPage() {
  const { khrPerUsd } = useExchangeRate();
  const router = useRouter();
  const { token } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<WalletTx[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPage: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const limit = 10;

  const loadWallet = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetchJson<{ data: { balance: number } }>(
        "/customer/wallet",
        token,
      );
      setBalance(Number(res.data?.balance ?? 0));
    } catch {
      setBalance(0);
    }
  }, [token]);

  const loadHistory = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetchJson<{
        data: WalletTx[];
        pagination: { totalPage: number; total: number };
      }>(`/customer/wallet/history?page=${page}&limit=${limit}`, token);
      setHistory(res.data ?? []);
      setPagination(res.pagination ?? { totalPage: 1, total: 0 });
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    if (CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY) return;
    void loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    if (CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY) return;
    void loadHistory();
  }, [loadHistory]);

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
      <div className="brand-page max-w-6xl">
        <div className="mt-8">
          <section className="relative overflow-hidden rounded-[2rem] bg-[var(--primary-deep)] p-6 text-white shadow-[0_28px_80px_-42px_rgba(36,23,15,0.85)] sm:p-8">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[var(--primary)]/30 blur-2xl" />
            <div className="absolute bottom-0 right-8 h-32 w-32 rounded-full border-[1rem] border-white/10 border-r-transparent" />
            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-white/62">Available balance</p>
              <p className="mt-4 font-[family-name:var(--font-oswald)] text-[clamp(2.25rem,8vw+1rem,3.75rem)] font-bold tracking-tight sm:text-6xl">
                {formatUsdFromKhr(balance, khrPerUsd)}
              </p>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/68">
                {CUSTOMER_WEB_WALLET_DEPOSIT_ENABLED
                  ? "Use your wallet for faster checkout and Baray top-ups from web or Telegram."
                  : "View your wallet balance and transaction history. Online top-up is coming soon."}
              </p>

              <div className="mt-8 max-w-xs">
                <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/48">History</p>
                  <p className="mt-1 text-sm font-bold text-white">{pagination.total} entries</p>
                </div>
              </div>
            </div>
          </section>

          {CUSTOMER_WEB_WALLET_DEPOSIT_ENABLED ? (
            <p className="brand-card mt-6 rounded-[2rem] p-6 text-sm text-[var(--text-muted)]">
              Deposit form placeholder — restore from git when enabling deposits.
            </p>
          ) : null}
        </div>

        <div className="mt-10">
          <section className="brand-card rounded-[2rem] p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="brand-kicker">Ledger</p>
                <h2 className="mt-2 font-[family-name:var(--font-oswald)] text-2xl font-bold text-[var(--text)]">
                  Transaction history
                </h2>
              </div>
              <p className="text-sm font-bold text-[var(--text-muted)]">{pagination.total} transactions</p>
            </div>
            {loading ? (
              <div className="mt-5 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-2xl bg-[color-mix(in_srgb,var(--border)_55%,white)]"
                  />
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-dashed border-[var(--border)] bg-white/55 px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                No transactions yet.
              </p>
            ) : (
              <ul className="mt-5 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-white/52">
                {history.map((tx) => (
                  <li
                    key={tx.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm transition hover:bg-white/70"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black capitalize text-[var(--text)]">{formatTxText(tx.type)}</span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${statusBadgeClass(tx.status)}`}
                        >
                          {formatWalletTxStatus(tx)}
                        </span>
                      </div>
                      {tx.created_at && (
                        <span className="mt-1 block text-xs text-[var(--text-muted)]">
                          {new Date(tx.created_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <span className="font-black tabular-nums text-[var(--text)]">
                      {formatUsdFromKhr(Number(tx.amount), khrPerUsd)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {!loading && pagination.totalPage > 1 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="brand-secondary-button rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm font-bold text-[var(--text-muted)]">
                  Page {page} / {pagination.totalPage}
                </span>
                <button
                  type="button"
                  disabled={page >= pagination.totalPage}
                  onClick={() => setPage((p) => p + 1)}
                  className="brand-secondary-button rounded-full px-4 py-2 text-sm font-bold disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* BarayDepositModal — enable when CUSTOMER_WEB_WALLET_DEPOSIT_ENABLED is true */}
    </SignInGate>
  );
}
