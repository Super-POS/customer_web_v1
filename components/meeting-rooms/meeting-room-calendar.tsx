"use client";

import { useMemo, useState } from "react";
import {
  IconChevronLeft,
  IconChevronRight,
} from "@/components/meeting-rooms/meeting-room-icons";
import { mr } from "@/components/meeting-rooms/meeting-room-layout";
import {
  addDaysIso,
  compareIso,
  parseIsoDate,
  todayIso,
  toIsoDate,
} from "@/components/meeting-rooms/meeting-room-date-utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Props = {
  selectedDate: string | null;
  onSelect: (iso: string) => void;
  minDate?: string;
  maxDate?: string;
};

export function MeetingRoomCalendar({
  selectedDate,
  onSelect,
  minDate = todayIso(),
  maxDate,
}: Props) {
  const max = maxDate ?? addDaysIso(todayIso(), 90);
  const initial = selectedDate ? parseIsoDate(selectedDate) : new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const monthLabel = useMemo(
    () =>
      new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [viewYear, viewMonth],
  );

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const grid: Array<{ iso: string; day: number; inMonth: boolean } | null> = [];

    for (let i = 0; i < startPad; i++) grid.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const iso = toIsoDate(new Date(viewYear, viewMonth, d));
      grid.push({ iso, day: d, inMonth: true });
    }
    return grid;
  }, [viewYear, viewMonth]);

  const canPrev =
    compareIso(toIsoDate(new Date(viewYear, viewMonth, 1)), minDate) > 0 ||
    viewYear > parseIsoDate(minDate).getFullYear() ||
    viewMonth > parseIsoDate(minDate).getMonth();

  const canNext = compareIso(toIsoDate(new Date(viewYear, viewMonth + 1, 0)), max) < 0;

  function prevMonth() {
    if (!canPrev) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (!canNext) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const today = todayIso();

  return (
    <div className={`${mr.card} ${mr.cardBody}`}>
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={prevMonth}
          disabled={!canPrev}
          aria-label="Previous month"
          className="brand-secondary-button flex h-10 w-10 cursor-pointer items-center justify-center rounded-full p-0 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <IconChevronLeft className="h-5 w-5" />
        </button>
        <p className="font-[family-name:var(--font-oswald)] text-lg font-bold tracking-tight text-[var(--text)] sm:text-xl">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={nextMonth}
          disabled={!canNext}
          aria-label="Next month"
          className="brand-secondary-button flex h-10 w-10 cursor-pointer items-center justify-center rounded-full p-0 disabled:cursor-not-allowed disabled:opacity-35"
        >
          <IconChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center">
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className="py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[var(--text-muted)]"
          >
            {w}
          </span>
        ))}
        {cells.map((cell, idx) => {
          if (!cell) {
            return <span key={`pad-${idx}`} className="aspect-square" />;
          }
          const disabled = compareIso(cell.iso, minDate) < 0 || compareIso(cell.iso, max) > 0;
          const selected = selectedDate === cell.iso;
          const isToday = cell.iso === today;
          return (
            <button
              key={cell.iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(cell.iso)}
              className={
                selected
                  ? "aspect-square cursor-pointer rounded-xl bg-[var(--primary)] text-sm font-black text-white shadow-[0_8px_20px_-10px_rgba(218,41,28,0.85)] transition-colors duration-200"
                  : disabled
                    ? "aspect-square cursor-not-allowed rounded-xl text-sm font-medium text-[var(--text-muted)] opacity-30"
                    : isToday
                      ? "aspect-square cursor-pointer rounded-xl border-2 border-[var(--primary)] bg-[var(--primary-soft)] text-sm font-bold text-[var(--primary-dark)] transition-colors duration-200 hover:bg-[var(--primary-soft-strong)]"
                      : "aspect-square cursor-pointer rounded-xl text-sm font-semibold text-[var(--text)] transition-colors duration-200 hover:bg-[var(--primary-soft)]"
              }
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-[var(--text-muted)]">
        Today is highlighted · Book up to 90 days ahead
      </p>
    </div>
  );
}
