/** Matches cashier `BakongPaidWatcherService` — polling `/cashier/ordering/bakong/order/:id/payment-state`. */
export type BakongPaymentStatePayload = {
  data?: {
    order_status?: string;
    bakong_transaction_status?: string | null;
  };
};

export function bakongOutcomeFromPoll(
  res: BakongPaymentStatePayload | null,
): "wait" | "paid" | "cancelled" {
  if (res == null || typeof res !== "object") {
    return "wait";
  }
  const d = res.data;
  if (d == null) {
    return "wait";
  }
  const os = (d.order_status ?? "").toLowerCase();
  const bts = (d.bakong_transaction_status ?? "").toLowerCase();
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
