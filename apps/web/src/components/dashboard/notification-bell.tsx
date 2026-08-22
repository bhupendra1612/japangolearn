"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellOff } from "lucide-react";
import type { DashboardNotification, NotificationKind } from "@/lib/insights";

const KIND_ICON: Record<NotificationKind, string> = {
  review: "🧠",
  streak: "🔥",
  achievement: "🏆",
  xp: "⭐",
};

function timeAgo(iso: string | null): string {
  if (!iso) return "now";
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * The bell previously rendered three hardcoded strings with a permanently lit
 * unread dot and a "Mark all read" that did nothing. Everything here now comes
 * from the learner's own data, and the dot reflects a real read marker.
 */
export function NotificationBell({ notifications }: { notifications: DashboardNotification[] }) {
  const [open, setOpen] = useState(false);
  const [readLocally, setReadLocally] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = readLocally ? 0 : notifications.filter((n) => n.unread).length;

  useEffect(() => {
    if (!open) return;
    function handle(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const markRead = async () => {
    /* Optimistic: the dot clears immediately, and the server stamp catches up.
       A failed stamp only means the dot returns on the next full load. */
    setReadLocally(true);
    try {
      const { markNotificationsSeen } = await import("@/app/actions/preferences");
      await markNotificationsSeen();
    } catch {
      /* Non-fatal — nothing the learner needs to act on. */
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-xl p-2 text-gray-500 transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications, none unread"
        }
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 min-w-[16px] rounded-full bg-red-500 px-1 text-center text-[9px] font-bold leading-4 text-white ring-2 ring-white dark:ring-gray-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="animate-scale-in absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={() => void markRead()}
                className="text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <BellOff className="h-6 w-6 text-gray-300 dark:text-gray-600" aria-hidden="true" />
              <p className="text-sm font-medium">Nothing new</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Finish a quest and your progress shows up here.
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto py-1">
              {notifications.map((notification, index) => (
                <Link
                  key={`${notification.kind}-${notification.occurredAt ?? index}`}
                  href={notification.href}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <span className="mt-0.5 shrink-0 text-lg" aria-hidden="true">
                    {KIND_ICON[notification.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-gray-800 dark:text-gray-200">
                      {notification.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {notification.body}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{timeAgo(notification.occurredAt)}</p>
                  </div>
                  {!readLocally && notification.unread && (
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-500"
                      aria-label="Unread"
                    />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
