"use client";

import { IconCalendar, IconUsers } from "@/components/meeting-rooms/meeting-room-icons";
import { mr } from "@/components/meeting-rooms/meeting-room-layout";
import { formatShortDate, formatTime12h } from "@/components/meeting-rooms/meeting-room-date-utils";
import { partyBucketLabel, type PartyBucketId } from "@/components/meeting-rooms/meeting-room-party-utils";

type Props = {
  guestCount: number;
  partyBucketId: PartyBucketId;
  dateIso: string;
  startTime: string;
  endTime: string;
  onEditGroup?: () => void;
  onEditSchedule?: () => void;
};

export function MeetingRoomBookingContext({
  guestCount,
  partyBucketId,
  dateIso,
  startTime,
  endTime,
  onEditGroup,
  onEditSchedule,
}: Props) {
  return (
    <div className={mr.contextRow}>
      <div
        className={`${mr.strip} flex flex-1 items-center justify-between gap-4 border border-[color-mix(in_srgb,var(--primary)_18%,var(--border))] bg-[var(--primary-soft)]`}
      >
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/85 text-[var(--primary-dark)] shadow-sm">
            <IconUsers className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[var(--primary-dark)]">
              Group
            </p>
            <p className={`${mr.lead} truncate text-sm font-bold text-[var(--text)]`}>
              {guestCount} {guestCount === 1 ? "person" : "people"} · {partyBucketLabel(partyBucketId)}
            </p>
          </div>
        </div>
        {onEditGroup ? (
          <button
            type="button"
            onClick={onEditGroup}
            className="cursor-pointer shrink-0 rounded-full border border-[color-mix(in_srgb,var(--primary)_24%,var(--border))] bg-white/90 px-3 py-1.5 text-xs font-bold text-[var(--primary-dark)] transition-colors duration-200 hover:border-[var(--primary)]"
          >
            Edit
          </button>
        ) : null}
      </div>

      <div
        className={`${mr.strip} flex flex-1 items-center justify-between gap-4 border border-[color-mix(in_srgb,var(--primary)_18%,var(--border))] bg-[var(--primary-soft)]`}
      >
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/85 text-[var(--primary-dark)] shadow-sm">
            <IconCalendar className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[var(--primary-dark)]">
              When
            </p>
            <p className={`${mr.lead} truncate text-sm font-bold text-[var(--text)]`}>
              {formatShortDate(dateIso)} · {formatTime12h(startTime)} – {formatTime12h(endTime)}
            </p>
          </div>
        </div>
        {onEditSchedule ? (
          <button
            type="button"
            onClick={onEditSchedule}
            className="cursor-pointer shrink-0 rounded-full border border-[color-mix(in_srgb,var(--primary)_24%,var(--border))] bg-white/90 px-3 py-1.5 text-xs font-bold text-[var(--primary-dark)] transition-colors duration-200 hover:border-[var(--primary)]"
          >
            Edit
          </button>
        ) : null}
      </div>
    </div>
  );
}
