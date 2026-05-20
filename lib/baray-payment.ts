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

/** Matches `GET /api/customer/wallet/deposit/:id/payment-state` for Baray deposits. */
export type BarayWalletDepositStatePayload = {
  data?: {
    wallet_transaction_status?: string;
  };
};

export function barayWalletDepositOutcomeFromPoll(
  res: BarayWalletDepositStatePayload | null,
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
