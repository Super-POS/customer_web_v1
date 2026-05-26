"use client";

import { IconCalendar, IconSparkle, IconUsers } from "@/components/meeting-rooms/meeting-room-icons";
import { mr } from "@/components/meeting-rooms/meeting-room-layout";

export function MeetingRoomsHero() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[var(--primary-deep)] p-5 text-white shadow-[0_28px_80px_-42px_rgba(36,23,15,0.85)] sm:p-8 lg:p-10">
      <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[var(--primary)]/28 blur-3xl" />
      <div className="absolute bottom-0 right-8 hidden h-40 w-40 rounded-full border-[1rem] border-white/10 border-r-transparent lg:block" />
      <div className="relative lg:flex lg:items-end lg:justify-between lg:gap-10">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/60">Club54 · Meeting spaces</p>
          <h1 className="mt-4 font-[family-name:var(--font-oswald)] text-[clamp(1.75rem,4vw+0.75rem,3.25rem)] font-bold leading-tight tracking-tight">
            Meeting rooms
          </h1>
          <p className={`${mr.lead} max-w-xl text-sm leading-relaxed text-white/72 sm:text-base`}>
            Book a room or check status on your reservations — our team confirms each booking.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 lg:mt-0 lg:max-w-md lg:justify-end">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-bold text-white/90 backdrop-blur">
            <IconUsers className="h-3.5 w-3.5" />
            Size filter
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-bold text-white/90 backdrop-blur">
            <IconCalendar className="h-3.5 w-3.5" />
            1-hour slots
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-bold text-white/90 backdrop-blur">
            <IconSparkle className="h-3.5 w-3.5" />
            Staff approval
          </span>
        </div>
      </div>
    </section>
  );
}
