/** Human-readable wallet transaction status (includes Baray note suffixes). */
export function formatWalletTxStatus(tx: {
  type?: string;
  status?: string;
  note?: string | null;
}): string {
  const type = String(tx.type ?? "").toLowerCase();
  const status = String(tx.status ?? "").toLowerCase();
  const noteLine = String(tx.note ?? "").split("\n")[0].toLowerCase();
  const isBaray =
    noteLine === "baray" || noteLine.startsWith("baray|");

  if (status === "approved") {
    return type === "deposit" ? "Completed" : "Approved";
  }

  if (status === "pending") {
    if (isBaray) return "Awaiting Baray payment";
    return "Pending";
  }

  if (status === "rejected") {
    if (noteLine.includes("|abandoned")) return "Cancelled";
    if (noteLine.includes("|expired")) return "Pay link expired";
    if (noteLine.includes("|failed")) return "Payment failed";
    return "Declined";
  }

  if (!status) return "Pending";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
