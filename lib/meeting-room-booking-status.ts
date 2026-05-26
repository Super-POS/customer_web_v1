export type MeetingRoomBookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type MeetingRoomPaymentStatus = "pending" | "success" | "failed" | "expired" | string;

export type BookingStatusPresentation = {
  label: string;
  hint: string;
  tone: "pending" | "review" | "success" | "muted" | "danger";
};

export function bookingStatusPresentation(
  status: string,
  paymentStatus?: string | null,
): BookingStatusPresentation {
  const booking = status.toLowerCase();
  const payment = String(paymentStatus ?? "pending").toLowerCase();

  if (booking === "cancelled") {
    return {
      label: "Cancelled",
      hint: "This reservation was cancelled.",
      tone: "muted",
    };
  }
  if (booking === "completed") {
    return {
      label: "Completed",
      hint: "This meeting has finished.",
      tone: "muted",
    };
  }
  if (booking === "confirmed") {
    return {
      label: "Confirmed",
      hint: "Your room is confirmed. See you then!",
      tone: "success",
    };
  }

  // pending (awaiting staff approval)
  if (payment === "success") {
    return {
      label: "Awaiting approval",
      hint: "Payment received. Our team will confirm your booking shortly.",
      tone: "review",
    };
  }
  if (payment === "failed" || payment === "expired") {
    return {
      label: "Payment required",
      hint: "Your payment did not complete. You can try paying again.",
      tone: "pending",
    };
  }
  return {
    label: "Awaiting payment",
    hint: "Complete payment with Baray, then our team will confirm your booking.",
    tone: "pending",
  };
}

export function statusBadgeClass(tone: BookingStatusPresentation["tone"]): string {
  switch (tone) {
    case "success":
      return "bg-[color-mix(in_srgb,var(--teal)_12%,white)] text-[var(--teal)] ring-[color-mix(in_srgb,var(--teal)_28%,var(--border))]";
    case "review":
      return "bg-[var(--primary-soft)] text-[var(--primary-dark)] ring-[color-mix(in_srgb,var(--primary)_22%,var(--border))]";
    case "danger":
      return "bg-red-50 text-red-800 ring-red-200";
    case "muted":
      return "bg-[var(--surface)] text-[var(--text-muted)] ring-[var(--border)]";
    default:
      return "bg-[color-mix(in_srgb,var(--mustard)_12%,white)] text-[var(--plum)] ring-[color-mix(in_srgb,var(--mustard)_35%,var(--border))]";
  }
}

export function paymentStatusLabel(paymentStatus?: string | null): string | null {
  const p = String(paymentStatus ?? "").toLowerCase();
  if (!p || p === "pending") return "Payment pending";
  if (p === "success") return "Paid";
  if (p === "failed") return "Payment failed";
  if (p === "expired") return "Payment expired";
  return p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
