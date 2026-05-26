export const MEETING_OPEN_HOUR = 8;
export const MEETING_CLOSE_HOUR = 21; // last allowed end time (e.g. 20:00–21:00)

export function todayIso(): string {
  const d = new Date();
  return toIsoDate(d);
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDisplayDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function addDaysIso(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function compareIso(a: string, b: string): number {
  return a.localeCompare(b);
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

/** Hourly start times from 08:00 through 20:00 (minimum 1h before close). */
export function meetingStartTimeOptions(): string[] {
  const out: string[] = [];
  for (let h = MEETING_OPEN_HOUR; h < MEETING_CLOSE_HOUR; h++) {
    out.push(formatHour(h));
  }
  return out;
}

/** Valid end times for a start: each whole hour after start, up to 21:00. */
export function meetingEndTimeOptions(start: string): string[] {
  const [sh] = start.split(":").map(Number);
  const out: string[] = [];
  for (let h = sh + 1; h <= MEETING_CLOSE_HOUR; h++) {
    out.push(formatHour(h));
  }
  return out;
}

/** @deprecated Use meetingStartTimeOptions / meetingEndTimeOptions */
export function meetingTimeOptions(): string[] {
  const out: string[] = [];
  for (let h = MEETING_OPEN_HOUR; h <= MEETING_CLOSE_HOUR; h++) {
    out.push(formatHour(h));
  }
  return out;
}

export function formatTime12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  let h = Number(hStr);
  const m = mStr ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

export function meetingDurationHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  return Math.max(0, mins / 60);
}

/** Bookings must be whole hours only, minimum 1 hour. */
export function isValidMeetingDuration(start: string, end: string): boolean {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (sm !== 0 || em !== 0) return false;
  const hours = meetingDurationHours(start, end);
  return hours >= 1 && Number.isInteger(hours);
}

export function addHoursToTime(start: string, hours: number): string | null {
  const [sh] = start.split(":").map(Number);
  const endHour = sh + hours;
  if (endHour > MEETING_CLOSE_HOUR) return null;
  return formatHour(endHour);
}

export function formatRoomType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatMoney(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}
