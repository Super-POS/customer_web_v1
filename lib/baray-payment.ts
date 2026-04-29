/** Matches cashier `BarayPaidWatcherService._barayOutcomeFromState` — polling `/baray/order/:id/payment-state`. */
export type BarayPaymentStatePayload = {
  data?: {
    order_status?: string;
    baray_transaction_status?: string | null;
  };
};

export function barayOutcomeFromPoll(
  res: BarayPaymentStatePayload | null,
): "wait" | "paid" | "cancelled" {
  if (res == null || typeof res !== "object") {
    return "wait";
  }
  const d = res.data;
  if (d == null) {
    return "wait";
  }
  const os = (d.order_status ?? "").toLowerCase();
  const bts = (d.baray_transaction_status ?? "").toLowerCase();
  if (bts === "success") {
    return "paid";
  }
  if (os === "cancelled") {
    return "cancelled";
  }
  if (os === "awaiting_payment") {
    return "wait";
  }
  return "paid";
}
