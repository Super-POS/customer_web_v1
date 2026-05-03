"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SignInGate } from "@/components/sign-in-gate";
import { formatUsd, formatUsdFromKhr } from "@/lib/api";
import { useExchangeRate } from "@/contexts/exchange-rate-context";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useAuth } from "@/lib/auth-context";
import { fetchJson } from "@/lib/customer-fetch";
import { CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY } from "@/lib/customer-web-flags";

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

const BARAY_DEPOSIT_POLL_MS = 1_500;
const BARAY_DEPOSIT_TIMEOUT_MS = 5 * 60_000;

export default function WalletPage() {
  const { khrPerUsd } = useExchangeRate();
  const router = useRouter();
  const { token } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<WalletTx[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPage: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [depositWaiting, setDepositWaiting] = useState(false);
  const [amount, setAmount] = useState("");
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumePollStartedRef = useRef(false);

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

  const clearDepositTimers = useCallback(() => {
    if (pollTimerRef.current != null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (timeoutTimerRef.current != null) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    setDepositWaiting(false);
  }, []);

  const watchDepositSettlement = useCallback(
    async (walletTransactionId: number) => {
      if (!token) return;
      clearDepositTimers();
      setDepositWaiting(true);

      timeoutTimerRef.current = setTimeout(() => {
        clearDepositTimers();
        notifyError("Still waiting for Baray confirmation. Refresh the wallet in a moment.");
      }, BARAY_DEPOSIT_TIMEOUT_MS);

      const tick = async () => {
        try {
          const res = await fetchJson<{
            data?: {
              wallet_transaction_status?: string;
              balance?: number;
            };
          }>(
            `/customer/wallet/deposit/${walletTransactionId}/payment-state`,
            token,
          );
          const status = String(res.data?.wallet_transaction_status ?? "").toLowerCase();
          if (status === "approved") {
            clearDepositTimers();
            setBalance(Number(res.data?.balance ?? 0));
            setAmount("");
            notifySuccess("Deposit received. Your balance has been updated.");
            await loadWallet();
            await loadHistory();
          } else if (status === "rejected") {
            clearDepositTimers();
            notifyError("Deposit was rejected or expired.");
            await loadHistory();
          }
        } catch {
          /* keep polling while Baray/webhook settles */
        }
      };

      await tick();
      pollTimerRef.current = setInterval(() => void tick(), BARAY_DEPOSIT_POLL_MS);
    },
    [token, clearDepositTimers, loadWallet, loadHistory],
  );

  useEffect(() => {
    if (CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client data fetch on mount
    void loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    if (CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client data fetch on mount / page change
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY) router.replace("/");
  }, [router]);

  useEffect(() => {
    return () => {
      clearDepositTimers();
    };
  }, [clearDepositTimers]);

  useEffect(() => {
    if (CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY || !token || loading || depositWaiting || resumePollStartedRef.current)
      return;
    const pendingBarayDeposit = history.find(
      (tx) =>
        String(tx.type ?? "").toLowerCase() === "deposit" &&
        String(tx.status ?? "").toLowerCase() === "pending" &&
        String(tx.note ?? "").toLowerCase().startsWith("baray"),
    );
    if (pendingBarayDeposit) {
      resumePollStartedRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resume Baray deposit poll after refresh
      void watchDepositSettlement(pendingBarayDeposit.id);
    }
  }, [token, loading, depositWaiting, history, watchDepositSettlement]);

  const submitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      notifyError("Enter a positive amount.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetchJson<{
        message?: string;
        data?: { url?: string; wallet_transaction_id?: number; expires_at?: string };
      }>("/customer/wallet/deposit/baray/intent", token, {
        method: "POST",
        body: JSON.stringify({ amount: n }),
      });
      const url = typeof res.data?.url === "string" ? res.data.url.trim() : "";
      if (!url) {
        throw new Error("Failed to load Baray payment page.");
      }
      const walletTransactionId = Number(res.data?.wallet_transaction_id);
      if (!Number.isFinite(walletTransactionId)) {
        throw new Error("Failed to start deposit watcher.");
      }
      resumePollStartedRef.current = true;
      window.open(url, "_blank", "noopener,noreferrer");
      notifySuccess(res.message ?? "Payment page opened. Complete the QR transfer in that tab.");
      await loadHistory();
      await watchDepositSettlement(walletTransactionId);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

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
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="relative overflow-hidden rounded-[2rem] bg-[var(--primary-deep)] p-6 text-white shadow-[0_28px_80px_-42px_rgba(36,23,15,0.85)] sm:p-8">
            <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[var(--primary)]/30 blur-2xl" />
            <div className="absolute bottom-0 right-8 h-32 w-32 rounded-full border-[1rem] border-white/10 border-r-transparent" />
            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-white/62">Available balance</p>
              <p className="mt-4 font-[family-name:var(--font-oswald)] text-[clamp(2.25rem,8vw+1rem,3.75rem)] font-bold tracking-tight sm:text-6xl">
                {formatUsdFromKhr(balance, khrPerUsd)}
              </p>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/68">
                Use your wallet for faster checkout, Baray QR deposits, and smoother counter pickup.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ["Top up", "Baray QR"],
                  ["History", `${pagination.total} entries`],
                  ["Status", submitting ? "Opening" : "Ready"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/48">{label}</p>
                    <p className="mt-1 text-sm font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <form onSubmit={submitDeposit} className="brand-card rounded-[2rem] p-6">
            <p className="brand-kicker">Instant top up</p>
            <h2 className="mt-2 font-[family-name:var(--font-oswald)] text-2xl font-bold text-[var(--text)]">
              Deposit with QR
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              Generate a Baray QR and keep this page open while your balance refreshes after confirmation.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-[var(--text)]">Amount (USD)</label>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="brand-input w-full rounded-2xl px-4 py-3 text-lg font-bold tabular-nums text-[var(--text)]"
                  placeholder="25.00"
                  required
                />
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[10, 25, 50].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAmount(String(n))}
                      className="rounded-full border border-[var(--border)] bg-white/70 px-3 py-2 text-xs font-black text-[var(--primary-dark)] transition hover:border-[var(--primary)] hover:bg-white"
                    >
                      {formatUsd(n)}
                    </button>
                  ))}
                </div>
              </div>             
            </div>

            <button
              type="submit"
              disabled={submitting || depositWaiting}
              className="brand-primary-button mt-5 w-full rounded-full py-3.5 text-sm font-black disabled:opacity-50"
            >
              {submitting ? "Opening Baray..." : depositWaiting ? "Waiting for payment..." : "Deposit"}
            </button>
          </form>
        </div>

        <div className="mt-10">
          <section className="brand-card rounded-[2rem] p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="brand-kicker">Ledger</p>
                <h2 className="mt-2 font-[family-name:var(--font-oswald)] text-2xl font-bold text-[var(--text)]">
                  Full history
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
                  <li key={tx.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm transition hover:bg-white/70">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black capitalize text-[var(--text)]">{formatTxText(tx.type)}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${statusBadgeClass(tx.status)}`}>
                          {formatTxText(tx.status)}
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
    </SignInGate>
  );
}
