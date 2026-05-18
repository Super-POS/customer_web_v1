/** Matches cashier `BakongPaidWatcherService` — polling `/cashier/ordering/bakong/order/:id/payment-state`. */
export type BakongPaymentStatePayload = {
  data?: {
    order_status?: string;
    bakong_transaction_status?: string | null;
  };
};

export function bakongOutcomeFromPoll(
  res: BakongPaymentStatePayload | null,
): "wait" | "paid" | "cancelled" | "expired" {
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
  if (bts === "expired" || bts === "failed") {
    return "expired";
  }
  if (os === "awaiting_payment") {
    return "wait";
  }
  return "paid";
}

/** Matches `GET /api/customer/wallet/deposit/:id/payment-state` for Bakong deposits. */
export type BakongWalletDepositStatePayload = {
  data?: {
    wallet_transaction_status?: string;
    bakong_response_message?: string | null;
  };
};

export function bakongWalletDepositOutcomeFromPoll(
  res: BakongWalletDepositStatePayload | null,
): "wait" | "paid" | "cancelled" {
  if (res == null || typeof res !== "object") {
    return "wait";
  }
  const status = String(res.data?.wallet_transaction_status ?? "").toLowerCase();
  if (status === "approved") {
    return "paid";
  }
  if (status === "rejected") {
    return "cancelled";
  }
  return "wait";
}
