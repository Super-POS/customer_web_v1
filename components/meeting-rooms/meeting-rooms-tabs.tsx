"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mr } from "@/components/meeting-rooms/meeting-room-layout";

const TABS = [
  { href: "/meeting-rooms", label: "Book a room", match: "book" as const },
  { href: "/meeting-rooms/bookings", label: "My bookings", match: "bookings" as const },
] as const;

function activeTab(pathname: string): "book" | "bookings" {
  if (pathname.startsWith("/meeting-rooms/bookings")) return "bookings";
  return "book";
}

export function MeetingRoomsTabs() {
  const pathname = usePathname();
  const current = activeTab(pathname);

  return (
    <nav className={mr.tabs} aria-label="Meeting rooms">
      {TABS.map(({ href, label, match }) => {
        const active = current === match;
        return (
          <Link
            key={href}
            href={href}
            className={`${mr.tabBtn} ${active ? mr.tabBtnActive : mr.tabBtnIdle}`}
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
