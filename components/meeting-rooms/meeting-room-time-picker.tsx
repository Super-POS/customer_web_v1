"use client";

import { useEffect, useMemo } from "react";
import { IconClock } from "@/components/meeting-rooms/meeting-room-icons";
import { mr } from "@/components/meeting-rooms/meeting-room-layout";
import {
  addHoursToTime,
  formatDisplayDate,
  formatTime12h,
  isValidMeetingDuration,
  meetingDurationHours,
  meetingEndTimeOptions,
  meetingStartTimeOptions,
} from "@/components/meeting-rooms/meeting-room-date-utils";

const START_OPTIONS = meetingStartTimeOptions();

const QUICK_DURATIONS = [1, 2, 3, 4] as const;

type Props = {
  dateIso: string;
  startTime: string;
  endTime: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  showDateBanner?: boolean;
};

export function MeetingRoomTimePicker({
  dateIso,
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  showDateBanner = true,
}: Props) {
  const duration = meetingDurationHours(startTime, endTime);
  const valid = isValidMeetingDuration(startTime, endTime);

  const endOptions = useMemo(
    () => meetingEndTimeOptions(startTime),
    [startTime],
  );

  // Keep end time on a valid whole-hour slot when start changes
  useEffect(() => {
    if (valid && endOptions.includes(endTime)) return;
    const fallback = endOptions[0] ?? addHoursToTime(startTime, 1);
    if (fallback && fallback !== endTime) {
      onEndChange(fallback);
    }
  }, [startTime, endOptions, endTime, valid, onEndChange]);

  function applyDuration(hours: number) {
    const next = addHoursToTime(startTime, hours);
    if (next && endOptions.includes(next)) {
      onEndChange(next);
    } else if (endOptions.length > 0) {
      onEndChange(endOptions[endOptions.length - 1]);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {showDateBanner ? (
        <div
          className={`${mr.strip} flex items-center gap-4 border border-[color-mix(in_srgb,var(--primary)_22%,var(--border))] bg-[var(--primary-soft)]`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 text-[var(--primary-dark)] shadow-sm">
            <IconClock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[var(--primary-dark)]">
              Selected date
            </p>
            <p className={`${mr.lead} text-sm font-bold text-[var(--text)]`}>{formatDisplayDate(dateIso)}</p>
          </div>
        </div>
      ) : null}

      <div className={`${mr.card} ${mr.cardBody}`}>
        <div>
          <p className={mr.kicker}>Quick duration</p>
          <p className={`${mr.lead} text-xs text-[var(--text-muted)]`}>
            Bookings are in 1-hour blocks (minimum 1 hour).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_DURATIONS.map((h) => {
            const active = valid && duration === h;
            const disabled = !endOptions.includes(addHoursToTime(startTime, h) ?? "");
            return (
              <button
                key={h}
                type="button"
                disabled={disabled}
                onClick={() => applyDuration(h)}
                className={
                  active
                    ? "cursor-pointer rounded-full bg-[var(--primary)] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-colors duration-200"
                    : disabled
                      ? "cursor-not-allowed rounded-full border border-[var(--border)] bg-white/50 px-3.5 py-1.5 text-xs font-bold text-[var(--text-muted)] opacity-45"
                      : "cursor-pointer rounded-full border border-[var(--border)] bg-white px-3.5 py-1.5 text-xs font-bold text-[var(--text-muted)] transition-colors duration-200 hover:border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] hover:text-[var(--primary-dark)]"
                }
              >
                {h}h
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <label className="block">
            <span className={mr.kicker}>Start time</span>
            <select
              value={startTime}
              onChange={(e) => onStartChange(e.target.value)}
              className={`brand-input ${mr.field} w-full cursor-pointer rounded-xl px-3 py-3 text-sm font-semibold text-[var(--text)]`}
            >
              {START_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {formatTime12h(t)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={mr.kicker}>End time</span>
            <select
              value={endTime}
              onChange={(e) => onEndChange(e.target.value)}
              className={`brand-input ${mr.field} w-full cursor-pointer rounded-xl px-3 py-3 text-sm font-semibold text-[var(--text)]`}
            >
              {endOptions.length === 0 ? (
                <option value={endTime}>—</option>
              ) : (
                endOptions.map((t) => (
                  <option key={t} value={t}>
                    {formatTime12h(t)}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
      </div>

      <div
        className={`${mr.strip} text-sm ${
          valid
            ? "border border-[color-mix(in_srgb,var(--teal)_35%,var(--border))] bg-[color-mix(in_srgb,var(--teal)_8%,white)] text-[var(--text)]"
            : "border border-[color-mix(in_srgb,var(--mustard)_45%,var(--border))] bg-[color-mix(in_srgb,var(--mustard)_10%,white)] text-[var(--text)]"
        }`}
        role="status"
      >
        {valid ? (
          <>
            <span className="font-bold text-[var(--primary-dark)]">Duration:</span> {duration} hour
            {duration !== 1 ? "s" : ""}{" "}
            <span className="text-[var(--text-muted)]">
              ({formatTime12h(startTime)} – {formatTime12h(endTime)})
            </span>
          </>
        ) : (
          <span className="font-semibold text-[var(--plum)]">
            Choose an end time at least 1 hour after start (whole hours only).
          </span>
        )}
      </div>
    </div>
  );
}
