"use client";

import { MeetingRoomsHero } from "@/components/meeting-rooms/meeting-rooms-hero";
import { MeetingRoomsTabs } from "@/components/meeting-rooms/meeting-rooms-tabs";
import { mr } from "@/components/meeting-rooms/meeting-room-layout";

export default function MeetingRoomsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${mr.pageShell} ${mr.page}`}>
      <MeetingRoomsHero />
      <MeetingRoomsTabs />
      <div className={mr.content}>{children}</div>
    </div>
  );
}
