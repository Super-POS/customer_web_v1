"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccountPageHeader } from "@/components/account-page-header";
import { SignInGate } from "@/components/sign-in-gate";
import { barayOutcomeFromPoll, type BarayPaymentStatePayload } from "@/lib/baray-payment";
import { formatRiel } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { fetchJson } from "@/lib/customer-fetch";
import { notifyError, notifySuccess } from "@/lib/notify";
import { CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY } from "@/lib/customer-web-flags";

type DetailLine = {
  id: number;
  unit_price: number;
  qty: number;
  menu?: { id: number; name: string; code?: string };
};

type OrderDetail = {
  id: number;
  receipt_number: string;
  total_price?: number | null;
  status: string;
  channel?: string;
  ordered_at?: string | null;
  coupon_code?: string | null;
  discount_percent?: number | null;
  discount_amount?: number | null;
  details?: DetailLine[];
};

type PaymentTx = {
  id: number;
  amount: number;
  method: string;
  status: string;
  note?: string | null;
  expires_at?: string | null;
  created_at?: string;
};

/** Cash/wallet/card — generic pending slot (not Baray QR). Baray uses `/payments/baray/intent`. */
const SIMPLE_PAY_METHODS = ["cash", "wallet", "card"] as const;

const BARAY_POLL_MS = 1_500;
const BARAY_TIMEOUT_MS = 5 * 60_000;

function formatStatus(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = Number(params?.id);
  const { token } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [payments, setPayments] = useState<PaymentTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [payBusy, setPayBusy] = useState<string | null>(null);
  const [barayBusy, setBarayBusy] = useState(false);
  const [barayWaiting, setBarayWaiting] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumePollStartedRef = useRef(false);

  const load = useCallback(async () => {
    if (!token) return;
    if (!Number.isFinite(id)) {
      setLoading(false);
      notifyError("Invalid order link.");
      setOrder(null);
      return;
    }
    setLoading(true);
    try {
      const o = await fetchJson<{ data: OrderDetail }>(`/customer/orders/${id}`, token);
      setOrder(o.data ?? null);
      if (CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY) {
        setPayments([]);
      } else {
        const p = await fetchJson<{ data: PaymentTx[] }>(`/customer/payments/order/${id}`, token);
        setPayments(p.data ?? []);
      }
    } catch (e) {
      setOrder(null);
      notifyError(e instanceof Error ? e.message : "Could not load order");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    resumePollStartedRef.current = false;
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client data fetch on mount
    void load();
  }, [load]);

  const clearBarayTimers = useCallback(() => {
    if (pollTimerRef.current != null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setBarayWaiting(false);
  }, []);

  const watchBaraySettlement = useCallback(
    async (orderId: number) => {
      if (!token) return;
      clearBarayTimers();
      setBarayWaiting(true);

      timeoutRef.current = setTimeout(() => {
        clearBarayTimers();
        notifyError("Waiting timed out — check payment status below or contact staff.");
      }, BARAY_TIMEOUT_MS);

      const tick = async () => {
        try {
          const res = await fetchJson(
            `/customer/payments/baray/order/${orderId}/payment-state`,
            token,
          );
          const outcome = barayOutcomeFromPoll(res as BarayPaymentStatePayload);
          if (outcome === "paid") {
            clearBarayTimers();
            notifySuccess("Payment received. Thank you!");
            await load();
          } else if (outcome === "cancelled") {
            clearBarayTimers();
            notifyError("This order was cancelled.");
            await load();
          }
        } catch {
          /* keep polling */
        }
      };

      await tick();
      pollTimerRef.current = setInterval(() => void tick(), BARAY_POLL_MS);
    },
    [token, clearBarayTimers, load],
  );

  useEffect(() => {
    return () => {
      clearBarayTimers();
    };
  }, [clearBarayTimers]);

  /** After refresh: resume polling if Baray payment still pending (same behaviour as cashier POS). */
  useEffect(() => {
    if (CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY || !token || loading || !order || resumePollStartedRef.current) return;
    const pendingBaray = payments.some(
      (tx) =>
        String(tx.method).toLowerCase() === "qr" &&
        String(tx.status).toLowerCase() === "pending" &&
        String(tx.note ?? "").toLowerCase() === "baray",
    );
    if (order.status === "awaiting_payment" && pendingBaray) {
      resumePollStartedRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resume Baray poll after refresh (matches cashier POS)
      void watchBaraySettlement(order.id);
    }
  }, [token, loading, order, payments, watchBaraySettlement]);

  const startBarayCheckout = async () => {
    if (!token || !order) return;
    setBarayBusy(true);
    try {
      const res = await fetchJson<{ data: { url?: string } }>(
        "/customer/payments/baray/intent",
        token,
        {
          method: "POST",
          body: JSON.stringify({ order_id: order.id }),
        },
      );
      /** Prevent the resume effect from starting a duplicate poll after `load()` updates payments. */
      resumePollStartedRef.current = true;
      const url = typeof res.data?.url === "string" ? res.data.url.trim() : "";
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      notifySuccess(
        url
          ? "Payment page opened — complete the QR transfer in that tab."
          : "Baray payment started — follow any on-screen instructions.",
      );
      await load();
      await watchBaraySettlement(order.id);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Could not start Baray payment");
    } finally {
      setBarayBusy(false);
    }
  };

  const initiatePayment = async (method: (typeof SIMPLE_PAY_METHODS)[number]) => {
    if (!token || !order) return;
    setPayBusy(method);
    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `pay-${order.id}-${method}`;
      const res = await fetchJson<{ message?: string }>(
        "/customer/payments",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            order_id: order.id,
            method,
          }),
          headers: {
            "Idempotency-Key": idempotencyKey,
          },
        },
      );
      notifySuccess(res.message ?? "Payment started.");
      await load();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setPayBusy(null);
    }
  };

  const checkExpiry = async (paymentId: number) => {
    if (!token) return;
    try {
      const res = await fetchJson<{ message?: string }>(
        `/customer/payments/${paymentId}/check-expiry`,
        token,
      );
      notifySuccess(res.message ?? "Checked.");
      await load();
    } catch (e) {
      const text =
        e instanceof Error ? e.message : "Could not refresh payment";
      notifyError(text);
    }
  };

  return (
    <SignInGate>
      <div className="brand-page max-w-3xl">
        <Link href="/orders" className="text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-dark)]">
          ← All orders
        </Link>

        <AccountPageHeader
          title="Order details"
          subtitle={
            CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY
              ? "Receipt line items. Pay at the counter with our staff."
              : "Receipt line items and payment options for this visit."
          }
        />

        {loading ? (
          <div className="mt-8 space-y-4">
            <div className="h-10 w-48 animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--border)_55%,white)]" />
            <div className="h-32 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--border)_55%,white)]" />
          </div>
        ) : !order ? (
          <p className="mt-8 text-[var(--text-muted)]">Order not found.</p>
        ) : (
          <>
            <div className="brand-card mt-8 rounded-[1.75rem] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--text)]">#{order.receipt_number}</h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{formatStatus(order.status)}</p>
                  <p className="mt-2 text-xs text-[var(--text-muted)] opacity-85">
                    {order.ordered_at ? new Date(order.ordered_at).toLocaleString() : "—"}
                  </p>
                </div>
                <div className="text-right">
                  {(order.details?.length ?? 0) > 0 ? (
                    <>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">Total due</p>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--primary)]">
                        {formatRiel(Number(order.total_price ?? 0))} ៛
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold tabular-nums text-[var(--primary)]">
                      {formatRiel(Number(order.total_price ?? 0))} ៛
                    </p>
                  )}
                </div>
              </div>

              {(order.details?.length ?? 0) > 0 && (
                <ul className="mt-6 divide-y divide-[var(--border)] border-t border-[var(--border)] pt-4">
                  {order.details!.map((d) => (
                    <li key={d.id} className="flex justify-between gap-2 py-2 text-sm">
                      <span className="text-[var(--text)]">
                        {d.qty}× {d.menu?.name ?? "Item"}
                      </span>
                      <span className="tabular-nums text-[var(--text)]">
                        {formatRiel(d.unit_price * d.qty)} ៛
                      </span>
                    </li>
                  ))}
                  {(() => {
                    const subtotal =
                      order.details!.reduce((s, d) => s + d.unit_price * d.qty, 0);
                    const disc = Number(order.discount_amount ?? 0);
                    const code = order.coupon_code?.trim();
                    const showDisc = disc > 0 && (code?.length ?? 0) > 0;
                    return (
                      <>
                        <li className="flex justify-between gap-2 py-2 text-sm font-medium text-[var(--text-muted)]">
                          <span>Subtotal</span>
                          <span className="tabular-nums">{formatRiel(subtotal)} ៛</span>
                        </li>
                        {showDisc ? (
                          <li className="flex justify-between gap-2 py-2 text-sm text-green-700 dark:text-green-400">
                            <span>
                              Discount ({code}
                              {order.discount_percent != null
                                ? `, ${order.discount_percent}%`
                                : ""}
                              )
                            </span>
                            <span className="tabular-nums font-semibold">-{formatRiel(disc)} ៛</span>
                          </li>
                        ) : null}
                      </>
                    );
                  })()}
                </ul>
              )}
            </div>

            {CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY ? (
              <section className="brand-card mt-8 rounded-[1.75rem] p-6">
                <h2 className="text-lg font-semibold text-[var(--text)]">Pay at the counter</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  When you are ready, see our cashier with this order. They will take payment and complete it in the POS.
                </p>
              </section>
            ) : (
              <>
                <section className="brand-card mt-8 rounded-[1.75rem] p-6">
                  <h2 className="text-lg font-semibold text-[var(--text)]">Pay with Baray (Khmer QR)</h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Opens the Baray payment page (same flow as our counter). Complete the bank QR transfer in the new tab
                    — we will detect payment automatically.
                  </p>
                  <button
                    type="button"
                    disabled={barayBusy || barayWaiting}
                    onClick={() => void startBarayCheckout()}
                    className="brand-primary-button mt-4 w-full rounded-full px-4 py-3.5 text-sm font-bold disabled:opacity-50 sm:w-auto sm:min-w-[14rem]"
                  >
                    {barayBusy ? "Starting…" : barayWaiting ? "Waiting for payment…" : "Pay with Baray (QR)"}
                  </button>
                  {barayWaiting && (
                    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-[var(--text)]">
                        <span className="font-medium text-[var(--text)]">Checking payment…</span> Leave the Baray tab open
                        until the transfer completes.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          clearBarayTimers();
                          notifySuccess("Stopped waiting — you can check status below or pay again.");
                        }}
                        className="brand-secondary-button shrink-0 rounded-full px-3 py-2 text-sm font-bold"
                      >
                        Stop waiting
                      </button>
                    </div>
                  )}
                </section>

                <section className="brand-card mt-8 rounded-[1.75rem] p-6">
                  <h2 className="text-lg font-semibold text-[var(--text)]">Other payment options</h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Reserve cash, wallet, or card for in-store handling. If a payment is already pending, finish or expire it
                    first.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {SIMPLE_PAY_METHODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        disabled={payBusy !== null || barayWaiting}
                        onClick={() => initiatePayment(m)}
                        className="brand-secondary-button rounded-full px-4 py-2 text-sm font-bold capitalize disabled:opacity-50"
                      >
                        {payBusy === m ? "…" : m}
                      </button>
                    ))}
                  </div>

                  {payments.length === 0 ? (
                    <p className="mt-4 text-sm text-[var(--text-muted)]">No payment attempts yet.</p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {payments.map((tx) => (
                        <li
                          key={tx.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--page)] px-4 py-3 text-sm"
                        >
                          <div>
                            <span className="font-medium capitalize text-[var(--text)]">{tx.method}</span>
                            {tx.note === "baray" && (
                              <span className="ml-1 rounded bg-[var(--primary-soft)] px-1.5 text-xs font-medium text-[var(--primary-dark)]">
                                Baray
                              </span>
                            )}
                            <span className="mx-2 text-[var(--border)]">·</span>
                            <span className="capitalize text-[var(--text-muted)]">{tx.status}</span>
                            {tx.expires_at && tx.status === "pending" && (
                              <span className="block text-xs text-[var(--text-muted)]">
                                Expires {new Date(tx.expires_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold tabular-nums">{formatRiel(Number(tx.amount))} ៛</span>
                            {tx.status === "pending" && (
                              <button
                                type="button"
                                onClick={() => checkExpiry(tx.id)}
                                className="text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-dark)]"
                              >
                                Refresh
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </>
        )}

      </div>
    </SignInGate>
  );
}
