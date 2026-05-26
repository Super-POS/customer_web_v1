import type { MeetingRoom } from "@/lib/meeting-room";

export type PartyBucketId = "1-2" | "3-4" | "5-8" | "9-16" | "17+";

export type PartyBucket = {
  id: PartyBucketId;
  label: string;
  subtitle: string;
  min: number;
  max: number;
  defaultGuests: number;
  /** Show rooms that fit this group — not oversized spaces */
  capacityMin: number;
  capacityMax: number;
};

export const MIN_GUESTS = 1;
export const MAX_GUESTS = 50;

export const PARTY_BUCKETS: PartyBucket[] = [
  {
    id: "1-2",
    label: "1–2",
    subtitle: "Solo or pair",
    min: 1,
    max: 2,
    defaultGuests: 2,
    capacityMin: 2,
    capacityMax: 4,
  },
  {
    id: "3-4",
    label: "3–4",
    subtitle: "Small team",
    min: 3,
    max: 4,
    defaultGuests: 4,
    capacityMin: 4,
    capacityMax: 8,
  },
  {
    id: "5-8",
    label: "5–8",
    subtitle: "Team meeting",
    min: 5,
    max: 8,
    defaultGuests: 6,
    capacityMin: 6,
    capacityMax: 12,
  },
  {
    id: "9-16",
    label: "9–16",
    subtitle: "Workshop",
    min: 9,
    max: 16,
    defaultGuests: 12,
    capacityMin: 10,
    capacityMax: 20,
  },
  {
    id: "17+",
    label: "17+",
    subtitle: "Large event",
    min: 17,
    max: 50,
    defaultGuests: 20,
    capacityMin: 17,
    capacityMax: 999,
  },
];

export function getPartyBucket(id: PartyBucketId): PartyBucket {
  return PARTY_BUCKETS.find((b) => b.id === id) ?? PARTY_BUCKETS[1];
}

export function roomMatchesPartyBucket(
  room: MeetingRoom,
  bucketId: PartyBucketId,
  guestCount: number,
): boolean {
  const b = getPartyBucket(bucketId);
  return (
    room.capacity >= guestCount &&
    room.capacity >= b.capacityMin &&
    room.capacity <= b.capacityMax
  );
}

export function clampGuestsForBucket(guests: number, bucketId: PartyBucketId): number {
  const b = getPartyBucket(bucketId);
  return Math.min(b.max, Math.max(b.min, guests));
}

export function clampGuestCount(guests: number): number {
  const n = Math.floor(Number(guests));
  if (!Number.isFinite(n)) return MIN_GUESTS;
  return Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, n));
}

/** Pick the size range that matches an exact headcount (for custom input). */
export function inferPartyBucketId(guests: number): PartyBucketId {
  const n = clampGuestCount(guests);
  if (n <= 2) return "1-2";
  if (n <= 4) return "3-4";
  if (n <= 8) return "5-8";
  if (n <= 16) return "9-16";
  return "17+";
}

export function partyBucketLabel(bucketId: PartyBucketId): string {
  const b = getPartyBucket(bucketId);
  return `${b.label} people`;
}

/** Largest capacity among bookable rooms (0 if none loaded). */
export function getMaxRoomCapacity(rooms: MeetingRoom[]): number {
  if (rooms.length === 0) return 0;
  return Math.max(...rooms.map((r) => Number(r.capacity) || 0));
}

export function guestCountExceedsVenue(guestCount: number, maxCapacity: number): boolean {
  return maxCapacity > 0 && guestCount > maxCapacity;
}

export function venueCapacityWarningMessage(guestCount: number, maxCapacity: number): string {
  return `Our largest room fits up to ${maxCapacity} ${maxCapacity === 1 ? "person" : "people"}. You entered ${guestCount} — please lower the number or contact us for a larger event.`;
}
