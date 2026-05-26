"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BarayBookingPaymentModal } from "@/components/meeting-rooms/baray-booking-payment-modal";
import {
  formatDisplayDate,
  formatMoney,
  formatTime12h,
} from "@/components/meeting-rooms/meeting-room-date-utils";
import { mr } from "@/components/meeting-rooms/meeting-room-layout";
import { SignInGate } from "@/components/sign-in-gate";
import { useAuth } from "@/lib/auth-context";
import {
  bookingStatusPresentation,
  paymentStatusLabel,
  statusBadgeClass,
} from "@/lib/meeting-room-booking-status";
import {
  cancelCustomerMeetingRoomBooking,
  getCustomerMeetingRoomBooking,
  type MeetingRoomBooking,
} from "@/lib/meeting-room";
import { notifyError, notifySuccess } from "@/lib/notify";

export default function MeetingRoomBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const id = Number(params.id);
  const [booking, setBooking] = useState<MeetingRoomBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    if (!token || !Number.isFinite(id)) return;
    setLoading(true);
    try {
      const data = await getCustomerMeetingRoomBooking(token, id);
      setBooking(data);
    } catch (e) {
      setBooking(null);
      notifyError(e instanceof Error ? e.message : "Could not load booking");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const presentation = booking
    ? bookingStatusPresentation(booking.status, booking.payment_status)
    : null;

  const needsPayment =
    booking &&
    booking.status.toLowerCase() === "pending" &&
    String(booking.payment_status ?? "pending").toLowerCase() !== "success";

  const canCancel =
    booking &&
    booking.status.toLowerCase() !== "cancelled" &&
    booking.status.toLowerCase() !== "completed";

  const handleCancel = async () => {
    if (!token || !booking) return;
    if (!window.confirm("Cancel this meeting room booking?")) return;
    setCancelling(true);
    try {
      await cancelCustomerMeetingRoomBooking(token, booking.id);
      notifySuccess("Booking cancelled.");
      router.push("/meeting-rooms/bookings");
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Could not cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <SignInGate>
      <div className={mr.content}>
        <Link href="/meeting-rooms/bookings" className={mr.backLink}>
          ← My bookings
        </Link>

        {loading ? (
          <div className={mr.skeletonTall} />
        ) : !booking || !presentation ? (
          <p className={mr.empty}>Booking not found.</p>
        ) : (
          <article className={`${mr.card} ${mr.cardBody}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={mr.kicker}>Booking #{id}</p>
                <h2 className={`${mr.lead} font-[family-name:var(--font-oswald)] text-2xl font-bold text-[var(--text)]`}>
                  {booking.room?.name ?? "Meeting room"}
                </h2>
                {booking.room?.description ? (
                  <p className={`${mr.lead} text-sm text-[var(--text-muted)]`}>{booking.room.description}</p>
                ) : null}
              </div>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em] ring-1 ${statusBadgeClass(presentation.tone)}`}
              >
                {presentation.label}
              </span>
            </div>

            <p className="text-sm leading-relaxed text-[var(--text-muted)]">{presentation.hint}</p>

            <dl className={`${mr.divider} grid gap-4 sm:grid-cols-2`}>
              <div>
                <dt className={mr.kicker}>Date</dt>
                <dd className={`${mr.lead} text-sm font-semibold`}>{formatDisplayDate(booking.check_in_date)}</dd>
              </div>
              <div>
                <dt className={mr.kicker}>Time</dt>
                <dd className={`${mr.lead} text-sm font-semibold`}>
                  {formatTime12h(booking.meeting_start_time)} – {formatTime12h(booking.meeting_end_time)}
                </dd>
              </div>
              <div>
                <dt className={mr.kicker}>Guests</dt>
                <dd className={`${mr.lead} text-sm font-semibold`}>{booking.num_guests}</dd>
              </div>
              <div>
                <dt className={mr.kicker}>Payment</dt>
                <dd className={`${mr.lead} text-sm font-semibold`}>{paymentStatusLabel(booking.payment_status)}</dd>
              </div>
              {booking.guest_name ? (
                <div>
                  <dt className={mr.kicker}>Name</dt>
                  <dd className={`${mr.lead} text-sm font-semibold`}>{booking.guest_name}</dd>
                </div>
              ) : null}
              {booking.purpose ? (
                <div className="sm:col-span-2">
                  <dt className={mr.kicker}>Purpose</dt>
                  <dd className={`${mr.lead} text-sm font-semibold`}>{booking.purpose}</dd>
                </div>
              ) : null}
              {booking.total_amount != null && Number(booking.total_amount) > 0 ? (
                <div>
                  <dt className={mr.kicker}>Total</dt>
                  <dd className={`${mr.lead} text-lg font-bold text-[var(--primary)]`}>
                    {formatMoney(Number(booking.total_amount))}
                  </dd>
                </div>
              ) : null}
            </dl>

            <div className={mr.actions}>
              {needsPayment ? (
                <button
                  type="button"
                  onClick={() => setPayOpen(true)}
                  className={`brand-primary-button w-full cursor-pointer ${mr.btn}`}
                >
                  Pay with Baray
                </button>
              ) : null}
              {canCancel ? (
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => void handleCancel()}
                  className={`brand-secondary-button w-full cursor-pointer ${mr.btn} disabled:opacity-50`}
                >
                  {cancelling ? "Cancelling…" : "Cancel booking"}
                </button>
              ) : null}
            </div>
          </article>
        )}
      </div>

      <BarayBookingPaymentModal
        bookingId={payOpen ? id : null}
        onClose={() => {
          setPayOpen(false);
          void load();
        }}
        onPaid={() => {
          setPayOpen(false);
          notifySuccess("Payment received. Our team will confirm your booking soon.");
          void load();
        }}
      />
    </SignInGate>
  );
}
