"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AccountPageHeader } from "@/components/account-page-header";
import { SignInGate } from "@/components/sign-in-gate";
import { BakongPaymentModal } from "@/components/payments/bakong-payment-modal";
import { formatUsdFromKhr } from "@/lib/api";
import { useExchangeRate } from "@/contexts/exchange-rate-context";
import { useAuth } from "@/lib/auth-context";
import { fetchJson } from "@/lib/customer-fetch";
import { notifyError, notifySuccess } from "@/lib/notify";
import { CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY } from "@/lib/customer-web-flags";
import {
  hasActivePendingBakongPayment,
  orderCanStartNewBakongPayment,
  orderAwaitingPayment,
} from "@/lib/order-payment";

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

/** Cash / wallet / card slots for in-store handling. Bakong KHQR has its own dedicated flow. */
const SIMPLE_PAY_METHODS = ["cash", "wallet", "card"] as const;

function formatStatus(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function OrderDetailPage() {
  const { khrPerUsd } = useExchangeRate();
  const params = useParams();
  const id = Number(params?.id);
  const { token } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [payments, setPayments] = useState<PaymentTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [payBusy, setPayBusy] = useState<string | null>(null);

  /** When non-null, the BakongPaymentModal is open for this order id. */
  const [bakongModalOpenForOrder, setBakongModalOpenForOrder] = useState<number | null>(null);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client data fetch on mount
    void load();
  }, [load]);

  /**
   * After refresh: if the order is still awaiting payment with a pending Bakong attempt,
   * reopen the modal so it can resume the poll. The modal handles intent rotation if the
   * previous QR has already expired on the server.
   */
  useEffect(() => {
    if (CUSTOMER_WEB_CASHIER_CHECKOUT_ONLY || !token || loading || !order || bakongModalOpenForOrder != null) {
      return;
    }
    if (order.status !== "awaiting_payment") return;
    if (hasActivePendingBakongPayment(payments)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-resume Bakong modal after refresh
      setBakongModalOpenForOrder(order.id);
    }
  }, [token, loading, order, payments, bakongModalOpenForOrder]);

  const canPayOnline = order != null && orderCanStartNewBakongPayment(order.status, payments);
  const canResumeBakong =
    order != null &&
    orderAwaitingPayment(order.status) &&
    hasActivePendingBakongPayment(payments);

  const startBakongCheckout = () => {
    if (!order || (!canPayOnline && !canResumeBakong)) return;
    setBakongModalOpenForOrder(order.id);
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
                        {formatUsdFromKhr(Number(order.total_price ?? 0), khrPerUsd)}
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold tabular-nums text-[var(--primary)]">
                      {formatUsdFromKhr(Number(order.total_price ?? 0), khrPerUsd)}
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
                        {formatUsdFromKhr(d.unit_price * d.qty, khrPerUsd)}
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
                          <span className="tabular-nums">{formatUsdFromKhr(subtotal, khrPerUsd)}</span>
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
                            <span className="tabular-nums font-semibold">-{formatUsdFromKhr(disc, khrPerUsd)}</span>
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
            ) : canPayOnline || canResumeBakong ? (
              <>
                <section className="brand-card mt-8 rounded-[1.75rem] p-6">
                  <h2 className="text-lg font-semibold text-[var(--text)]">Pay with Bakong (KHQR)</h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {canResumeBakong && !canPayOnline
                      ? "You have an active QR for this order. Resume scanning or wait for it to expire."
                      : "Scan the QR code with your Bakong-supported banking app (ABA, ACLEDA, Wing, etc.). We detect payment automatically."}
                  </p>
                  <button
                    type="button"
                    disabled={bakongModalOpenForOrder != null}
                    onClick={startBakongCheckout}
                    className="brand-primary-button mt-4 w-full rounded-full px-4 py-3.5 text-sm font-bold disabled:opacity-50 sm:w-auto sm:min-w-[14rem]"
                  >
                    {bakongModalOpenForOrder != null
                      ? "QR open…"
                      : canResumeBakong && !canPayOnline
                        ? "Resume Bakong payment"
                        : "Pay with Bakong (KHQR)"}
                  </button>
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
                        disabled={payBusy !== null || bakongModalOpenForOrder != null}
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
                            {tx.note === "bakong" && (
                              <span className="ml-1 rounded bg-[var(--primary-soft)] px-1.5 text-xs font-medium text-[var(--primary-dark)]">
                                Bakong
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
                            <span className="font-semibold tabular-nums">{formatUsdFromKhr(Number(tx.amount), khrPerUsd)}</span>
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
            ) : (
              <section className="brand-card mt-8 rounded-[1.75rem] p-6">
                <h2 className="text-lg font-semibold text-[var(--text)]">Payment</h2>
                {order.status.toLowerCase() === "cancelled" ? (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">This order was cancelled.</p>
                ) : (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Payment received. No further payment is needed for this order.
                  </p>
                )}
                {payments.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {payments.map((tx) => (
                      <li
                        key={tx.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--page)] px-4 py-3 text-sm"
                      >
                        <div>
                          <span className="font-medium capitalize text-[var(--text)]">{tx.method}</span>
                          {tx.note === "bakong" && (
                            <span className="ml-1 rounded bg-[var(--primary-soft)] px-1.5 text-xs font-medium text-[var(--primary-dark)]">
                              Bakong
                            </span>
                          )}
                          <span className="mx-2 text-[var(--border)]">·</span>
                          <span className="capitalize text-[var(--text-muted)]">{tx.status}</span>
                        </div>
                        <span className="font-semibold tabular-nums">
                          {formatUsdFromKhr(Number(tx.amount), khrPerUsd)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            )}
          </>
        )}

      </div>

      <BakongPaymentModal
        orderId={canPayOnline || canResumeBakong ? bakongModalOpenForOrder : null}
        receiptNumber={order?.receipt_number ?? null}
        totalKhrFallback={order?.total_price != null ? Number(order.total_price) : null}
        onClose={() => setBakongModalOpenForOrder(null)}
        onPaid={() => {
          setBakongModalOpenForOrder(null);
          void load();
        }}
      />
    </SignInGate>
  );
}
