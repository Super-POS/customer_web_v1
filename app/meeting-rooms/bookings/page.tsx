"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BarayBookingPaymentModal } from "@/components/meeting-rooms/baray-booking-payment-modal";
import { MeetingRoomBookingCard } from "@/components/meeting-rooms/meeting-room-booking-card";
import { mr } from "@/components/meeting-rooms/meeting-room-layout";
import { SignInGate } from "@/components/sign-in-gate";
import { useAuth } from "@/lib/auth-context";
import {
  cancelCustomerMeetingRoomBooking,
  listCustomerMeetingRoomBookings,
  type MeetingRoomBooking,
} from "@/lib/meeting-room";
import { notifyError, notifySuccess } from "@/lib/notify";

export default function MeetingRoomBookingsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<MeetingRoomBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [payBookingId, setPayBookingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await listCustomerMeetingRoomBookings(token);
      setRows(data);
    } catch (e) {
      setRows([]);
      notifyError(e instanceof Error ? e.message : "Could not load bookings");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCancel = async (id: number) => {
    if (!token) return;
    if (!window.confirm("Cancel this meeting room booking?")) return;
    setCancellingId(id);
    try {
      await cancelCustomerMeetingRoomBooking(token, id);
      notifySuccess("Booking cancelled.");
      await load();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : "Could not cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  const active = rows.filter((b) => {
    const s = b.status.toLowerCase();
    return s === "pending" || s === "confirmed";
  });
  const past = rows.filter((b) => {
    const s = b.status.toLowerCase();
    return s === "cancelled" || s === "completed";
  });

  return (
    <SignInGate>
      <div className={mr.content}>
        <header>
          <h2 className={mr.pageTitle}>Your reservations</h2>
          <p className={`${mr.lead} text-sm text-[var(--text-muted)]`}>
            Track payment and staff approval. Bookings stay pending until a cashier or admin confirms them.
          </p>
        </header>

        {loading ? (
          <div className={mr.list}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={mr.skeleton} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className={mr.empty}>
            No bookings yet.{" "}
            <Link href="/meeting-rooms" className="font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)]">
              Reserve a room
            </Link>
          </p>
        ) : (
          <div className={mr.section}>
            {active.length > 0 ? (
              <section className={mr.section}>
                <h3 className={mr.sectionTitle}>Upcoming & in progress</h3>
                <ul className={mr.list}>
                  {active.map((b) => (
                    <li key={b.id}>
                      <MeetingRoomBookingCard
                        booking={b}
                        onPay={setPayBookingId}
                        onCancel={handleCancel}
                        cancelling={cancellingId === b.id}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {past.length > 0 ? (
              <section className={mr.section}>
                <h3 className={mr.sectionTitle}>Past bookings</h3>
                <ul className={mr.list}>
                  {past.map((b) => (
                    <li key={b.id}>
                      <MeetingRoomBookingCard booking={b} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>

      <BarayBookingPaymentModal
        bookingId={payBookingId}
        onClose={() => {
          setPayBookingId(null);
          void load();
        }}
        onPaid={() => {
          setPayBookingId(null);
          notifySuccess("Payment received. Our team will confirm your booking soon.");
          void load();
        }}
      />
    </SignInGate>
  );
}
