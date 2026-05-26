"use client";

import {
  IconCalendar,
  IconCheck,
  IconDoor,
  IconUsers,
} from "@/components/meeting-rooms/meeting-room-icons";

export type BookingStep = "group" | "schedule" | "room" | "confirm";

const STEPS: { id: BookingStep; label: string; Icon: typeof IconUsers }[] = [
  { id: "group", label: "Group", Icon: IconUsers },
  { id: "schedule", label: "When", Icon: IconCalendar },
  { id: "room", label: "Room", Icon: IconDoor },
  { id: "confirm", label: "Confirm", Icon: IconCheck },
];

export function MeetingRoomBookingStepper({
  current,
  maxReached,
}: {
  current: BookingStep;
  maxReached: BookingStep;
}) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);
  const maxIdx = STEPS.findIndex((s) => s.id === maxReached);

  return (
    <nav aria-label="Booking progress">
      <ol className="flex items-start gap-0">
        {STEPS.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const reachable = i <= maxIdx;
          const { Icon } = step;

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <span
                  className={
                    active
                      ? "flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-[0_10px_24px_-12px_rgba(218,41,28,0.75)] ring-4 ring-[color-mix(in_srgb,var(--primary)_18%,transparent)]"
                      : done
                        ? "flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-soft-strong)] text-[var(--primary-dark)]"
                        : reachable
                          ? "flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]"
                          : "flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-white/60 text-[var(--text-muted)] opacity-50"
                  }
                >
                  {done ? (
                    <IconCheck className="h-4 w-4" />
                  ) : (
                    <Icon className={`h-4 w-4 ${active ? "text-white" : ""}`} />
                  )}
                </span>
                <span
                  className={
                    active
                      ? "text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--primary-dark)]"
                      : done
                        ? "text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--primary-dark)]"
                        : "text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]"
                  }
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 ? (
                <div
                  className={
                    done
                      ? "mx-0.5 mt-5 h-0.5 min-w-[0.5rem] flex-1 rounded-full bg-[var(--primary)]"
                      : "mx-0.5 mt-5 h-0.5 min-w-[0.5rem] flex-1 rounded-full bg-[var(--border)]"
                  }
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
