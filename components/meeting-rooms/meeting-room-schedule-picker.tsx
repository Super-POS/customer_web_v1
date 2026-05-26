"use client";

import { MeetingRoomCalendar } from "@/components/meeting-rooms/meeting-room-calendar";
import { MeetingRoomTimePicker } from "@/components/meeting-rooms/meeting-room-time-picker";
import { mr } from "@/components/meeting-rooms/meeting-room-layout";

type Props = {
  selectedDate: string | null;
  onDateSelect: (iso: string) => void;
  startTime: string;
  endTime: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
};

export function MeetingRoomSchedulePicker({
  selectedDate,
  onDateSelect,
  startTime,
  endTime,
  onStartChange,
  onEndChange,
}: Props) {
  return (
    <div className={mr.scheduleGrid}>
      <MeetingRoomCalendar selectedDate={selectedDate} onSelect={onDateSelect} />
      {selectedDate ? (
        <MeetingRoomTimePicker
          dateIso={selectedDate}
          startTime={startTime}
          endTime={endTime}
          onStartChange={onStartChange}
          onEndChange={onEndChange}
          showDateBanner={false}
        />
      ) : (
        <div
          className={`${mr.strip} flex min-h-[12rem] items-center justify-center border border-dashed border-[var(--border)] bg-white/60 text-center text-sm text-[var(--text-muted)] lg:min-h-0 lg:self-stretch`}
        >
          Pick a date to set your time slot
        </div>
      )}
    </div>
  );
}
