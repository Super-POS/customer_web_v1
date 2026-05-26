"use client";

import Link from "next/link";
import {
  formatDisplayDate,
  formatMoney,
  formatTime12h,
} from "@/components/meeting-rooms/meeting-room-date-utils";
import {
  bookingStatusPresentation,
  paymentStatusLabel,
  statusBadgeClass,
} from "@/lib/meeting-room-booking-status";
import { mr } from "@/components/meeting-rooms/meeting-room-layout";
import type { MeetingRoomBooking } from "@/lib/meeting-room";

function canPay(booking: MeetingRoomBooking): boolean {
  const status = booking.status.toLowerCase();
  const payment = String(booking.payment_status ?? "pending").toLowerCase();
  return status === "pending" && payment !== "success";
}

function canCancel(booking: MeetingRoomBooking): boolean {
  const status = booking.status.toLowerCase();
  return status !== "cancelled" && status !== "completed";
}

export function MeetingRoomBookingCard({
  booking,
  onPay,
  onCancel,
  cancelling,
}: {
  booking: MeetingRoomBooking;
  onPay?: (id: number) => void;
  onCancel?: (id: number) => void;
  cancelling?: boolean;
}) {
  const presentation = bookingStatusPresentation(booking.status, booking.payment_status);
  const paymentLabel = paymentStatusLabel(booking.payment_status);
  const showPay = canPay(booking) && onPay;
  const showCancel = canCancel(booking) && onCancel;

  return (
    <article className={`${mr.card} ${mr.cardBody}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={mr.blockTitle}>
            {booking.room?.name ?? `Booking #${booking.id}`}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {formatDisplayDate(booking.check_in_date)}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--text)]">
            {formatTime12h(booking.meeting_start_time)} – {formatTime12h(booking.meeting_end_time)}
            <span className="font-normal text-[var(--text-muted)]">
              {" "}
              · {booking.num_guests} guest{booking.num_guests === 1 ? "" : "s"}
            </span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em] ring-1 ${statusBadgeClass(presentation.tone)}`}
          >
            {presentation.label}
          </span>
          {paymentLabel ? (
            <span className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              {paymentLabel}
            </span>
          ) : null}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-[var(--text-muted)]">{presentation.hint}</p>

      <div className={`${mr.divider} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Booking #{booking.id}
          </p>
          {booking.total_amount != null && Number(booking.total_amount) > 0 ? (
            <p className="mt-0.5 text-lg font-bold tabular-nums text-[var(--primary)]">
              {formatMoney(Number(booking.total_amount))}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {showPay ? (
            <button
              type="button"
              onClick={() => onPay(booking.id)}
              className="brand-primary-button cursor-pointer rounded-full px-4 py-2 text-xs font-bold sm:text-sm"
            >
              Pay with Baray
            </button>
          ) : null}
          {showCancel ? (
            <button
              type="button"
              disabled={cancelling}
              onClick={() => onCancel(booking.id)}
              className="brand-secondary-button cursor-pointer rounded-full px-4 py-2 text-xs font-bold disabled:opacity-50 sm:text-sm"
            >
              {cancelling ? "Cancelling…" : "Cancel"}
            </button>
          ) : null}
          <Link
            href={`/meeting-rooms/bookings/${booking.id}`}
            className="rounded-full border border-[var(--border)] bg-white/80 px-4 py-2 text-xs font-bold text-[var(--primary-dark)] transition hover:border-[var(--primary)] sm:text-sm"
          >
            Details
          </Link>
        </div>
      </div>
    </article>
  );
}
