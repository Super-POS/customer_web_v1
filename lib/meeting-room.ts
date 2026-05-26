import { apiErrorMessage, apiUrl } from "@/lib/api";
import { fetchJson } from "@/lib/customer-fetch";

export type MeetingRoom = {
  id: number;
  name: string;
  description?: string | null;
  capacity: number;
  price_per_hour?: string | number | null;
  type: string;
  status: string;
  is_available?: boolean;
};

export type CreatePublicBookingPayload = {
  room_id: number;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  guest_origin?: string;
  check_in_date: string; // YYYY-MM-DD
  check_out_date: string; // YYYY-MM-DD
  meeting_start_time: string; // HH:MM
  meeting_end_time: string; // HH:MM
  num_guests: number;
  num_rooms: number;
  purpose?: string;
  payment_method?: string; // baray
  notes?: string;
};

export type MeetingRoomBooking = {
  id: number;
  status: string;
  payment_status?: string;
  total_amount?: string | number | null;
  baray_payment_url?: string | null;
  baray_expires_at?: string | null;
  check_in_date: string;
  check_out_date: string;
  meeting_start_time: string;
  meeting_end_time: string;
  num_guests: number;
  num_rooms?: number;
  guest_name?: string;
  purpose?: string | null;
  notes?: string | null;
  created_at?: string;
  room?: MeetingRoom;
};

/** @deprecated Use MeetingRoomBooking */
export type BookingRow = MeetingRoomBooking;

export async function listPublicMeetingRooms(): Promise<MeetingRoom[]> {
  const res = await fetch(apiUrl("/share/meeting-rooms"), { cache: "no-store" });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(apiErrorMessage(body, "Could not load meeting rooms."));
  return (body?.data ?? []) as MeetingRoom[];
}

export async function listPublicMeetingRoomAvailability(
  checkIn: string,
  checkOut: string,
): Promise<MeetingRoom[]> {
  const qs = new URLSearchParams({ check_in: checkIn, check_out: checkOut });
  const res = await fetch(apiUrl(`/share/meeting-rooms/availability?${qs.toString()}`), {
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(apiErrorMessage(body, "Could not check availability."));
  return (body?.data ?? []) as MeetingRoom[];
}

export async function createPublicMeetingRoomBooking(
  payload: CreatePublicBookingPayload,
): Promise<BookingRow> {
  const res = await fetch(apiUrl("/share/meeting-rooms/bookings"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(apiErrorMessage(body, "Could not create booking."));
  return body?.data as BookingRow;
}

export type BarayBookingIntent = {
  _id: string;
  url: string;
  status: string;
  expires_at: string;
  booking_id: number;
};

export async function listCustomerMeetingRoomBookings(token: string): Promise<MeetingRoomBooking[]> {
  const body = await fetchJson<{ data: MeetingRoomBooking[] }>(
    "/customer/meeting-room-bookings",
    token,
  );
  return body.data ?? [];
}

export async function getCustomerMeetingRoomBooking(
  token: string,
  bookingId: number,
): Promise<MeetingRoomBooking> {
  const body = await fetchJson<{ data: MeetingRoomBooking }>(
    `/customer/meeting-room-bookings/${bookingId}`,
    token,
  );
  return body.data;
}

export async function createCustomerMeetingRoomBooking(
  token: string,
  payload: CreatePublicBookingPayload,
): Promise<MeetingRoomBooking> {
  const body = await fetchJson<{ data: MeetingRoomBooking; message?: string }>(
    "/customer/meeting-room-bookings",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  return body.data;
}

export async function cancelCustomerMeetingRoomBooking(
  token: string,
  bookingId: number,
): Promise<MeetingRoomBooking> {
  const body = await fetchJson<{ data: MeetingRoomBooking; message?: string }>(
    `/customer/meeting-room-bookings/${bookingId}/cancel`,
    token,
    { method: "PATCH" },
  );
  return body.data;
}

export async function createCustomerBookingBarayIntent(
  token: string,
  bookingId: number,
): Promise<BarayBookingIntent> {
  const body = await fetchJson<{ data: BarayBookingIntent }>(
    `/customer/meeting-room-bookings/${bookingId}/baray/intent`,
    token,
    { method: "POST" },
  );
  return body.data;
}

export async function pollCustomerBookingPaymentState(
  token: string,
  bookingId: number,
): Promise<"wait" | "paid" | "cancelled"> {
  try {
    const body = await fetchJson<any>(`/customer/meeting-room-bookings/${bookingId}/payment-state`, token);
    const st = String(body?.data?.baray_transaction_status ?? "").toLowerCase();
    const bs = String(body?.data?.booking_status ?? "").toLowerCase();
    if (st === "success") return "paid";
    if (st === "failed" || st === "expired" || bs === "cancelled") return "cancelled";
    return "wait";
  } catch {
    return "wait";
  }
}

