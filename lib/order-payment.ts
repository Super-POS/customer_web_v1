type PaymentRow = {
  method: string;
  status: string;
  note?: string | null;
  expires_at?: string | null;
};

/** True when the customer can still pay for this order (Bakong / in-app payment). */
export function orderAwaitingPayment(status: string | null | undefined): boolean {
  return String(status ?? "").toLowerCase() === "awaiting_payment";
}

export function orderHasSuccessfulPayment(payments: { status: string }[]): boolean {
  return payments.some((tx) => String(tx.status).toLowerCase() === "success");
}

export function isBakongPaymentTx(tx: { method: string; note?: string | null }): boolean {
  const note = String(tx.note ?? "").toLowerCase();
  return String(tx.method).toLowerCase() === "qr" && (note === "bakong" || note.startsWith("bakong\n"));
}

/** Pending Bakong QR that has not passed its expiry timestamp. */
export function hasActivePendingBakongPayment(payments: PaymentRow[]): boolean {
  const now = Date.now();
  return payments.some((tx) => {
    if (!isBakongPaymentTx(tx) || String(tx.status).toLowerCase() !== "pending") {
      return false;
    }
    if (!tx.expires_at) return true;
    return new Date(tx.expires_at).getTime() > now;
  });
}

export function orderCanStartNewBakongPayment(
  orderStatus: string | null | undefined,
  payments: PaymentRow[],
): boolean {
  return (
    orderAwaitingPayment(orderStatus) &&
    !orderHasSuccessfulPayment(payments) &&
    !hasActivePendingBakongPayment(payments)
  );
}
