"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  MeetingRoomBookingStepper,
  type BookingStep,
} from "@/components/meeting-rooms/meeting-room-booking-stepper";
import { MeetingRoomSchedulePicker } from "@/components/meeting-rooms/meeting-room-schedule-picker";
import { MeetingRoomPartyFilter } from "@/components/meeting-rooms/meeting-room-party-filter";
import { MeetingRoomBookingContext } from "@/components/meeting-rooms/meeting-room-booking-context";
import { MeetingRoomCard } from "@/components/meeting-rooms/meeting-room-card";
import { BarayBookingPaymentModal } from "@/components/meeting-rooms/baray-booking-payment-modal";
import { mr } from "@/components/meeting-rooms/meeting-room-layout";
import {
  formatDisplayDate,
  formatMoney,
  formatTime12h,
  isValidMeetingDuration,
  meetingDurationHours,
} from "@/components/meeting-rooms/meeting-room-date-utils";
import {
  clampGuestCount,
  getMaxRoomCapacity,
  getPartyBucket,
  guestCountExceedsVenue,
  inferPartyBucketId,
  MIN_GUESTS,
  partyBucketLabel,
  roomMatchesPartyBucket,
  venueCapacityWarningMessage,
  type PartyBucketId,
} from "@/components/meeting-rooms/meeting-room-party-utils";
import {
  createCustomerMeetingRoomBooking,
  listPublicMeetingRoomAvailability,
  listPublicMeetingRooms,
  type CreatePublicBookingPayload,
  type MeetingRoom,
} from "@/lib/meeting-room";
import { CUSTOMER_ACCESS_DENIED_MESSAGE } from "@/lib/auth-token";
import { notifyError, notifySuccess } from "@/lib/notify";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/contexts/auth-modal-context";

const STEP_ORDER: BookingStep[] = ["group", "schedule", "room", "confirm"];

function stepIndex(s: BookingStep): number {
  return STEP_ORDER.indexOf(s);
}

function StepHeader({
  title,
  description,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div>
      <h2 className={mr.pageTitle}>{title}</h2>
      <p className={`${mr.lead} text-sm leading-relaxed text-[var(--text-muted)]`}>{description}</p>
    </div>
  );
}

export default function MeetingRoomsPage() {
  const { token, ready, isTelegramWebApp, signOut } = useAuth();
  const { openLogin } = useAuthModal();

  const [step, setStep] = useState<BookingStep>("group");
  const [maxStep, setMaxStep] = useState<BookingStep>("group");

  const [partyBucketId, setPartyBucketId] = useState<PartyBucketId | null>("1-2");
  const [guestCount, setGuestCount] = useState(2);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");

  const [catalogRooms, setCatalogRooms] = useState<MeetingRoom[]>([]);
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const prevGuestCountRef = useRef(guestCount);

  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<
    Omit<
      CreatePublicBookingPayload,
      | "room_id"
      | "check_in_date"
      | "check_out_date"
      | "meeting_start_time"
      | "meeting_end_time"
      | "num_guests"
      | "num_rooms"
    >
  >({
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    guest_origin: "",
    purpose: "",
    payment_method: "baray",
    notes: "",
  });

  const goTo = useCallback(
    (next: BookingStep) => {
      setStep(next);
      if (stepIndex(next) > stepIndex(maxStep)) {
        setMaxStep(next);
      }
    },
    [maxStep],
  );

  const maxVenueCapacity = useMemo(
    () => getMaxRoomCapacity(catalogRooms),
    [catalogRooms],
  );

  const guestCountOverCapacity = useMemo(
    () => guestCountExceedsVenue(guestCount, maxVenueCapacity),
    [guestCount, maxVenueCapacity],
  );

  function setPartySize(count: number) {
    const n = clampGuestCount(count);
    const prev = prevGuestCountRef.current;
    prevGuestCountRef.current = n;
    setGuestCount(n);
    setPartyBucketId(inferPartyBucketId(n));

    if (
      maxVenueCapacity > 0 &&
      guestCountExceedsVenue(n, maxVenueCapacity) &&
      !guestCountExceedsVenue(prev, maxVenueCapacity)
    ) {
      notifyError(venueCapacityWarningMessage(n, maxVenueCapacity));
    }
  }

  function tryContinueFromGroup() {
    if (guestCountExceedsVenue(guestCount, maxVenueCapacity)) {
      notifyError(venueCapacityWarningMessage(guestCount, maxVenueCapacity));
      return;
    }
    goTo("schedule");
  }

  function selectPartyBucket(id: PartyBucketId) {
    const bucket = getPartyBucket(id);
    setPartySize(clampGuestCount(bucket.defaultGuests));
  }

  const scheduleValid = useMemo(
    () => selectedDate != null && isValidMeetingDuration(startTime, endTime),
    [selectedDate, startTime, endTime],
  );

  const sizeFilteredRooms = useMemo(() => {
    if (!partyBucketId) return [];
    return rooms.filter((r) => roomMatchesPartyBucket(r, partyBucketId, guestCount));
  }, [rooms, partyBucketId, guestCount]);

  const availableRooms = useMemo(
    () => sizeFilteredRooms.filter((r) => r.is_available !== false),
    [sizeFilteredRooms],
  );

  const bookedRooms = useMemo(
    () => sizeFilteredRooms.filter((r) => r.is_available === false),
    [sizeFilteredRooms],
  );

  const loadAvailability = useCallback(async (dateIso: string) => {
    setRoomsLoading(true);
    setRoomsError(null);
    setSelectedRoom(null);
    try {
      const data = await listPublicMeetingRoomAvailability(dateIso, dateIso);
      setRooms(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load availability.";
      setRoomsError(msg);
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    void listPublicMeetingRooms()
      .then(setCatalogRooms)
      .catch(() => setCatalogRooms([]));
  }, []);

  useEffect(() => {
    if (step !== "room" || !selectedDate) return;
    void loadAvailability(selectedDate);
  }, [step, selectedDate, loadAvailability]);

  const canSubmit = useMemo(
    () =>
      selectedRoom != null &&
      form.guest_name.trim().length > 0 &&
      form.guest_phone.trim().length > 0 &&
      form.guest_email.trim().length > 0,
    [selectedRoom, form],
  );

  const durationHours = meetingDurationHours(startTime, endTime);
  const estimatedTotal = useMemo(() => {
    if (!selectedRoom?.price_per_hour || durationHours <= 0) return null;
    const rate = Number(selectedRoom.price_per_hour);
    if (Number.isNaN(rate)) return null;
    return formatMoney(rate * durationHours);
  }, [selectedRoom, durationHours]);

  async function submitBooking() {
    if (!selectedRoom || !selectedDate || !partyBucketId) return;
    if (!token) {
      if (!isTelegramWebApp) openLogin();
      else notifyError("Please sign in to book a room.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreatePublicBookingPayload = {
        ...form,
        room_id: selectedRoom.id,
        check_in_date: selectedDate,
        check_out_date: selectedDate,
        meeting_start_time: startTime,
        meeting_end_time: endTime,
        num_guests: guestCount,
        num_rooms: 1,
        guest_origin: form.guest_origin?.trim() || undefined,
        purpose: form.purpose?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
        payment_method: "baray",
      };
      const created = await createCustomerMeetingRoomBooking(token, payload);
      setBookingId(Number(created.id));
      notifySuccess("Booking created. Complete payment in Baray to confirm.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not create booking.";
      if (msg === CUSTOMER_ACCESS_DENIED_MESSAGE) {
        signOut();
        if (!isTelegramWebApp) openLogin();
      }
      notifyError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setStep("group");
    setMaxStep("group");
    setPartyBucketId(null);
    setGuestCount(2);
    setSelectedDate(null);
    setSelectedRoom(null);
    setRooms([]);
    setRoomsError(null);
  }

  return (
    <>
      <MeetingRoomBookingStepper current={step} maxReached={maxStep} />

      {/* Step 1: Group size */}
      {step === "group" ? (
        <section className={`motion-reduce:animate-none animate-fade-up ${mr.step}`}>
          <StepHeader
            title="How many people?"
            description="Enter your group size or pick a range — we'll only show rooms that fit."
          />
          <MeetingRoomPartyFilter
            bucketId={partyBucketId}
            guestCount={guestCount}
            maxVenueCapacity={maxVenueCapacity}
            onBucketChange={selectPartyBucket}
            onGuestCountChange={setPartySize}
          />
          <div className={mr.ctaWrap}>
            <button
              type="button"
              disabled={
                !partyBucketId ||
                guestCount < MIN_GUESTS ||
                guestCountOverCapacity
              }
              onClick={tryContinueFromGroup}
              className={`brand-primary-button w-full cursor-pointer ${mr.btn} ${mr.ctaBtn} disabled:cursor-not-allowed disabled:opacity-45`}
            >
              Continue
            </button>
          </div>
        </section>
      ) : null}

      {/* Step 2: Date + time */}
      {step === "schedule" && partyBucketId ? (
        <section className={`motion-reduce:animate-none animate-fade-up ${mr.step}`}>
          <StepHeader
            title="When do you need the room?"
            description="Pick a date and time — bookings are in 1-hour blocks."
          />
          <MeetingRoomSchedulePicker
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            startTime={startTime}
            endTime={endTime}
            onStartChange={setStartTime}
            onEndChange={setEndTime}
          />
          <div className={mr.actions}>
            <button
              type="button"
              onClick={() => setStep("group")}
              className={`brand-secondary-button w-full cursor-pointer ${mr.btn}`}
            >
              Back
            </button>
            <button
              type="button"
              disabled={!scheduleValid}
              onClick={() => goTo("room")}
              className={`brand-primary-button w-full cursor-pointer ${mr.btn} disabled:cursor-not-allowed disabled:opacity-45`}
            >
              See matching rooms
            </button>
          </div>
        </section>
      ) : null}

      {/* Step 3: Room */}
      {step === "room" && partyBucketId && selectedDate ? (
        <section className={`motion-reduce:animate-none animate-fade-up ${mr.step}`}>
          <MeetingRoomBookingContext
            guestCount={guestCount}
            partyBucketId={partyBucketId}
            dateIso={selectedDate}
            startTime={startTime}
            endTime={endTime}
            onEditGroup={() => setStep("group")}
            onEditSchedule={() => setStep("schedule")}
          />

          <StepHeader
            title="Pick a room"
            description={
              roomsLoading
                ? "Checking availability…"
                : availableRooms.length > 0
                  ? `${availableRooms.length} room${availableRooms.length === 1 ? "" : "s"} for ${guestCount} ${guestCount === 1 ? "person" : "people"} (${partyBucketLabel(partyBucketId)})`
                  : `No rooms free for ${guestCount} people on this date — try another time or group size`
            }
          />

          {roomsLoading ? (
            <div className={mr.roomGridSkeleton}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`${mr.skeleton} border border-[var(--border)] bg-white/60`}
                />
              ))}
            </div>
          ) : roomsError ? (
            <div
              className={`${mr.strip} border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[var(--primary-soft)] text-sm font-semibold text-[var(--primary-dark)]`}
            >
              {roomsError}
            </div>
          ) : (
            <>
              <div className={mr.roomGrid}>
                {availableRooms.map((r) => (
                  <MeetingRoomCard
                    key={r.id}
                    room={r}
                    guestCount={guestCount}
                    startTime={startTime}
                    endTime={endTime}
                    onSelect={() => {
                      setSelectedRoom(r);
                      goTo("confirm");
                    }}
                  />
                ))}
              </div>
              {!roomsLoading && availableRooms.length === 0 && sizeFilteredRooms.length === 0 ? (
                <div
                  className={`${mr.strip} border border-[var(--border)] bg-white/80 text-sm text-[var(--text-muted)]`}
                >
                  No rooms in our catalogue match this group size. Try a different range above.
                </div>
              ) : null}
              {bookedRooms.length > 0 ? (
                <div className={mr.step}>
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    Booked on this date
                  </p>
                  <div className={mr.roomGrid}>
                    {bookedRooms.map((r) => (
                      <MeetingRoomCard
                        key={r.id}
                        room={r}
                        disabled
                        guestCount={guestCount}
                        startTime={startTime}
                        endTime={endTime}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}

          <button
            type="button"
            onClick={() => setStep("schedule")}
            className={`brand-secondary-button w-full cursor-pointer ${mr.btn}`}
          >
            Back
          </button>
        </section>
      ) : null}

      {/* Step 4: Confirm */}
      {step === "confirm" && selectedRoom && selectedDate && partyBucketId ? (
        <section className={`motion-reduce:animate-none animate-fade-up ${mr.step}`}>
          <MeetingRoomBookingContext
            guestCount={guestCount}
            partyBucketId={partyBucketId}
            dateIso={selectedDate}
            startTime={startTime}
            endTime={endTime}
            onEditGroup={() => {
              setStep("group");
              setMaxStep("group");
            }}
            onEditSchedule={() => {
              setStep("schedule");
              setMaxStep("schedule");
            }}
          />

          <div className={mr.checkoutGrid}>
            <div className={`${mr.card} h-fit overflow-hidden !p-0`}>
              <div className="border-b border-[var(--border)] bg-[var(--primary-soft)] px-5 py-4 sm:px-6 sm:py-5">
                <p className={mr.kicker}>Your room</p>
                <p className={`${mr.lead} font-[family-name:var(--font-oswald)] text-2xl font-bold text-[var(--text)]`}>
                  {selectedRoom.name}
                </p>
              </div>
              <ul className="space-y-4 px-5 py-5 text-sm sm:px-6 sm:py-6">
                <li className="flex justify-between gap-4 border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] pb-4">
                  <span className="text-[var(--text-muted)]">Date</span>
                  <span className="font-bold text-[var(--text)]">{formatDisplayDate(selectedDate)}</span>
                </li>
                <li className="flex justify-between gap-4 border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] pb-4">
                  <span className="text-[var(--text-muted)]">Time</span>
                  <span className="text-right font-bold text-[var(--text)]">
                    {formatTime12h(startTime)} – {formatTime12h(endTime)}
                    <span className={`${mr.lead} block text-xs font-semibold text-[var(--text-muted)]`}>
                      {durationHours} {durationHours === 1 ? "hour" : "hours"}
                    </span>
                  </span>
                </li>
                <li className="flex justify-between gap-4 border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] pb-4">
                  <span className="text-[var(--text-muted)]">Guests</span>
                  <span className="font-bold text-[var(--text)]">
                    {guestCount} · seats up to {selectedRoom.capacity}
                  </span>
                </li>
                {estimatedTotal ? (
                  <li className="flex justify-between gap-4">
                    <span className="text-[var(--text-muted)]">Estimated total</span>
                    <span className="text-right">
                      <span className="font-[family-name:var(--font-oswald)] text-xl font-bold text-[var(--primary-dark)]">
                        {estimatedTotal}
                      </span>
                      <span className={`${mr.lead} block text-xs text-[var(--text-muted)]`}>
                        Before tax · final at payment
                      </span>
                    </span>
                  </li>
                ) : null}
              </ul>
              <div className="border-t border-[var(--border)] px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    setStep("room");
                    setMaxStep("room");
                  }}
                  className="cursor-pointer text-sm font-bold text-[var(--primary-dark)] underline-offset-2 transition hover:underline"
                >
                  Change room
                </button>
              </div>
            </div>

          {ready && !token ? (
            <div className={`${mr.card} ${mr.cardBody} h-fit`}>
              <p className={mr.blockTitle}>Sign in to book</p>
              <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                Sign in to pay with Baray and confirm your reservation.
              </p>
              {!isTelegramWebApp ? (
                <button
                  type="button"
                  onClick={openLogin}
                  className={`brand-primary-button w-full cursor-pointer ${mr.btn}`}
                >
                  Sign in
                </button>
              ) : null}
            </div>
          ) : (
            <div className={`${mr.card} h-fit`}>
              <p className="font-[family-name:var(--font-oswald)] text-lg font-bold text-[var(--text)]">
                Contact details
              </p>
              <div className={mr.step}>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-bold text-[var(--text-muted)]">Full name *</span>
                    <input
                      className={`brand-input ${mr.field} w-full rounded-xl px-3 py-2.5 text-sm`}
                      autoComplete="name"
                      value={form.guest_name}
                      onChange={(e) => setForm((p) => ({ ...p, guest_name: e.target.value }))}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-[var(--text-muted)]">Phone *</span>
                    <input
                      className={`brand-input ${mr.field} w-full rounded-xl px-3 py-2.5 text-sm`}
                      autoComplete="tel"
                      type="tel"
                      value={form.guest_phone}
                      onChange={(e) => setForm((p) => ({ ...p, guest_phone: e.target.value }))}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-bold text-[var(--text-muted)]">Email *</span>
                    <input
                      className={`brand-input ${mr.field} w-full rounded-xl px-3 py-2.5 text-sm`}
                      autoComplete="email"
                      type="email"
                      value={form.guest_email}
                      onChange={(e) => setForm((p) => ({ ...p, guest_email: e.target.value }))}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-bold text-[var(--text-muted)]">Meeting purpose (optional)</span>
                  <input
                    className={`brand-input ${mr.field} w-full rounded-xl px-3 py-2.5 text-sm`}
                    value={form.purpose ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-[var(--text-muted)]">Notes (optional)</span>
                  <textarea
                    className={`brand-input ${mr.field} w-full rounded-xl px-3 py-2.5 text-sm`}
                    rows={2}
                    value={form.notes ?? ""}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </label>
              </div>
              <div className={mr.actions}>
                <button
                  type="button"
                  onClick={() => setStep("room")}
                  className={`brand-secondary-button w-full cursor-pointer ${mr.btn}`}
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canSubmit || submitting}
                  onClick={() => void submitBooking()}
                  className={`brand-primary-button w-full cursor-pointer ${mr.btn} disabled:cursor-not-allowed disabled:opacity-45`}
                >
                  {submitting ? "Creating booking…" : "Book & pay with Baray"}
                </button>
              </div>
            </div>
          )}
          </div>
        </section>
      ) : null}     
      <BarayBookingPaymentModal
        bookingId={bookingId}
        onClose={() => setBookingId(null)}
        onPaid={() => {
          setBookingId(null);
          notifySuccess("Payment received. Track approval under My bookings.");
          resetFlow();
        }}
      />
    </>
  );
}
