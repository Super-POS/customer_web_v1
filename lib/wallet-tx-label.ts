/** Human-readable wallet transaction status (includes Bakong note suffixes). */
export function formatWalletTxStatus(tx: {
  type?: string;
  status?: string;
  note?: string | null;
}): string {
  const type = String(tx.type ?? "").toLowerCase();
  const status = String(tx.status ?? "").toLowerCase();
  const noteLine = String(tx.note ?? "").split("\n")[0].toLowerCase();
  const isBakong =
    noteLine === "bakong" || noteLine.startsWith("bakong|") || noteLine.startsWith("bakong\n");

  if (status === "approved") {
    return type === "deposit" ? "Completed" : "Approved";
  }

  if (status === "pending") {
    if (isBakong) return "Awaiting Bakong payment";
    return "Pending";
  }

  if (status === "rejected") {
    if (noteLine.includes("|abandoned")) return "Cancelled";
    if (noteLine.includes("|expired")) return "QR expired";
    if (noteLine.includes("|failed")) return "Payment failed";
    if (noteLine.includes("bakong_qr_failed")) return "QR could not be created";
    return "Declined";
  }

  if (!status) return "Pending";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
