type PaymentRow = {
  method: string;
  status: string;
  note?: string | null;
  expires_at?: string | null;
};

/** True when the customer can still pay for this order (Baray / in-app payment). */
export function orderAwaitingPayment(status: string | null | undefined): boolean {
  return String(status ?? "").toLowerCase() === "awaiting_payment";
}

export function orderHasSuccessfulPayment(payments: { status: string }[]): boolean {
  return payments.some((tx) => String(tx.status).toLowerCase() === "success");
}

export function isBarayPaymentTx(tx: { method: string; note?: string | null }): boolean {
  const note = String(tx.note ?? "").toLowerCase();
  return String(tx.method).toLowerCase() === "qr" && (note === "baray" || note.startsWith("baray|"));
}

/** Pending Baray pay link that has not passed its expiry timestamp. */
export function hasActivePendingBarayPayment(payments: PaymentRow[]): boolean {
  const now = Date.now();
  return payments.some((tx) => {
    if (!isBarayPaymentTx(tx) || String(tx.status).toLowerCase() !== "pending") {
      return false;
    }
    if (!tx.expires_at) return true;
    return new Date(tx.expires_at).getTime() > now;
  });
}

export function orderCanStartNewBarayPayment(
  orderStatus: string | null | undefined,
  payments: PaymentRow[],
): boolean {
  return (
    orderAwaitingPayment(orderStatus) &&
    !orderHasSuccessfulPayment(payments) &&
    !hasActivePendingBarayPayment(payments)
  );
}
