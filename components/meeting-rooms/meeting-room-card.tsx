"use client";

import { IconTag, IconUsers } from "@/components/meeting-rooms/meeting-room-icons";
import { mr } from "@/components/meeting-rooms/meeting-room-layout";
import {
  formatMoney,
  formatRoomType,
  meetingDurationHours,
} from "@/components/meeting-rooms/meeting-room-date-utils";
import type { MeetingRoom } from "@/lib/meeting-room";

type Props = {
  room: MeetingRoom;
  selected?: boolean;
  disabled?: boolean;
  guestCount?: number;
  startTime?: string;
  endTime?: string;
  onSelect?: () => void;
};

export function MeetingRoomCard({
  room,
  selected,
  disabled,
  guestCount,
  startTime,
  endTime,
  onSelect,
}: Props) {
  const fitsGroup =
    guestCount != null && room.capacity >= guestCount && room.capacity <= guestCount + 4;
  const hours =
    startTime && endTime ? meetingDurationHours(startTime, endTime) : 0;
  const rate = room.price_per_hour != null ? Number(room.price_per_hour) : NaN;
  const estimate =
    !Number.isNaN(rate) && hours > 0 ? formatMoney(rate * hours) : null;

  const surface = disabled
    ? `${mr.card} w-full cursor-not-allowed text-left opacity-50`
    : selected
      ? `w-full cursor-pointer rounded-[2rem] border-2 border-[var(--primary)] bg-[var(--primary-soft)] p-5 text-left shadow-[var(--shadow-soft)] ring-4 ring-[color-mix(in_srgb,var(--primary)_14%,transparent)] sm:p-6`
      : `${mr.card} brand-card-hover w-full cursor-pointer text-left`;

  return (
    <button type="button" disabled={disabled} onClick={onSelect} className={surface}>
      <div className="flex items-start justify-between gap-4">
        <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--primary-dark)]">
          {formatRoomType(room.type)}
        </span>
        {disabled ? (
          <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-0.5 text-[0.62rem] font-bold text-[var(--text-muted)]">
            Booked
          </span>
        ) : fitsGroup ? (
          <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--teal)_12%,white)] px-2.5 py-0.5 text-[0.62rem] font-bold text-[var(--teal)] ring-1 ring-[color-mix(in_srgb,var(--teal)_28%,var(--border))]">
            Great fit
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--teal)_12%,white)] px-2.5 py-0.5 text-[0.62rem] font-bold text-[var(--teal)] ring-1 ring-[color-mix(in_srgb,var(--teal)_28%,var(--border))]">
            Available
          </span>
        )}
      </div>

      <p className="mt-4 font-[family-name:var(--font-oswald)] text-xl font-bold tracking-tight text-[var(--text)]">
        {room.name}
      </p>

      {room.description ? (
        <p className={`${mr.lead} line-clamp-2 text-sm leading-relaxed text-[var(--text-muted)]`}>
          {room.description}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[color-mix(in_srgb,var(--border)_70%,transparent)] pt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)] ring-1 ring-[var(--border)]">
          <IconUsers className="h-3.5 w-3.5 shrink-0 text-[var(--primary-dark)]" />
          Up to {room.capacity}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--text-muted)] ring-1 ring-[var(--border)]">
          <IconTag className="h-3.5 w-3.5 shrink-0 text-[var(--primary-dark)]" />
          {formatMoney(room.price_per_hour)} / hr
        </span>
        {estimate ? (
          <span className="ml-auto text-xs font-black text-[var(--primary-dark)]">
            Est. {estimate}
          </span>
        ) : null}
      </div>
    </button>
  );
}
