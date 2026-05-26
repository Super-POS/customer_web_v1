"use client";

import { IconUsers } from "@/components/meeting-rooms/meeting-room-icons";
import { mr } from "@/components/meeting-rooms/meeting-room-layout";
import {
  clampGuestCount,
  MAX_GUESTS,
  MIN_GUESTS,
  PARTY_BUCKETS,
  type PartyBucketId,
} from "@/components/meeting-rooms/meeting-room-party-utils";

type Props = {
  bucketId: PartyBucketId | null;
  guestCount: number;
  maxVenueCapacity: number;
  onBucketChange: (id: PartyBucketId) => void;
  onGuestCountChange: (count: number) => void;
};

export function MeetingRoomPartyFilter({
  bucketId,
  guestCount,
  maxVenueCapacity,
  onBucketChange,
  onGuestCountChange,
}: Props) {
  const overCapacity =
    maxVenueCapacity > 0 && guestCount > maxVenueCapacity;
  function applyGuestCount(raw: number) {
    onGuestCountChange(clampGuestCount(raw));
  }

  function onInputChange(raw: string) {
    if (raw.trim() === "") return;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    applyGuestCount(parsed);
  }

  return (
    <div className={`${mr.card} ${mr.cardBody}`}>
      <div>
        <p className={mr.kicker}>Group size</p>
        <p className={`${mr.lead} text-sm text-[var(--text-muted)]`}>
          Enter how many people are coming, or pick a range below.
        </p>
      </div>

      <div className={`${mr.strip} border border-[var(--border)] bg-[var(--surface)]`}>
        <label className="block">
          <span className="text-xs font-bold text-[var(--text-muted)]">Number of people</span>
          <div className={`${mr.lead} flex flex-wrap items-center gap-3 sm:gap-4`}>
            <button
              type="button"
              aria-label="Decrease guests"
              disabled={guestCount <= MIN_GUESTS}
              onClick={() => applyGuestCount(guestCount - 1)}
              className="brand-secondary-button flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full p-0 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_GUESTS}
              max={MAX_GUESTS}
              step={1}
              value={guestCount}
              onChange={(e) => onInputChange(e.target.value)}
              onBlur={(e) => applyGuestCount(Number.parseInt(e.target.value, 10) || MIN_GUESTS)}
              className="w-24 min-w-[5rem] rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-center font-[family-name:var(--font-oswald)] text-2xl font-bold text-[var(--text)] outline-none ring-[var(--primary)] focus:border-[var(--primary)] focus:ring-2"
              aria-label="Number of people"
            />
            <button
              type="button"
              aria-label="Increase guests"
              disabled={guestCount >= MAX_GUESTS}
              onClick={() => applyGuestCount(guestCount + 1)}
              className="brand-secondary-button flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full p-0 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
            <span className="text-sm font-semibold text-[var(--text-muted)]">
              {guestCount === 1 ? "person" : "people"}
              {maxVenueCapacity > 0 ? (
                <span className="ml-1 font-normal">
                  (largest room: {maxVenueCapacity})
                </span>
              ) : (
                <span className="ml-1 font-normal">(max {MAX_GUESTS})</span>
              )}
            </span>
          </div>
        </label>
      </div>

      {overCapacity ? (
        <div
          role="alert"
          className={`${mr.strip} border border-[color-mix(in_srgb,#dc2626_35%,var(--border))] bg-[color-mix(in_srgb,#dc2626_8%,white)] text-sm font-semibold leading-snug text-[#b91c1c]`}
        >
          Our largest room holds up to {maxVenueCapacity}{" "}
          {maxVenueCapacity === 1 ? "person" : "people"}. Please enter {maxVenueCapacity} or fewer to
          book online.
        </div>
      ) : null}

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Or choose a range
        </p>
        <div className={`${mr.lead} grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5`}>
          {PARTY_BUCKETS.map((b) => {
            const active = bucketId === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => onBucketChange(b.id)}
                className={
                  active
                    ? "cursor-pointer rounded-2xl border-2 border-[var(--primary)] bg-[var(--primary-soft)] p-4 text-left shadow-sm ring-4 ring-[color-mix(in_srgb,var(--primary)_12%,transparent)] transition-colors duration-200"
                    : "cursor-pointer rounded-2xl border border-[var(--border)] bg-white p-4 text-left transition-colors duration-200 hover:border-[color-mix(in_srgb,var(--primary)_28%,var(--border))] hover:bg-[var(--surface)]"
                }
              >
                <span className="flex items-center gap-2">
                  <IconUsers
                    className={`h-4 w-4 shrink-0 ${active ? "text-[var(--primary-dark)]" : "text-[var(--text-muted)]"}`}
                  />
                  <span
                    className={`font-[family-name:var(--font-oswald)] text-lg font-bold ${active ? "text-[var(--primary-dark)]" : "text-[var(--text)]"}`}
                  >
                    {b.label}
                  </span>
                </span>
                <span className={`${mr.lead} block text-xs font-semibold text-[var(--text-muted)]`}>
                  {b.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
