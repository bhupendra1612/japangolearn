"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Route, Brain, BarChart3, User } from "lucide-react";

/**
 * Five slots, thumb-reachable. Review takes the slot the Tasks page used to
 * hold: the dashboard already surfaces today's quests in full, whereas the
 * review queue is the thing a learner should be able to reach in one tap.
 */
const bottomNavItems = [
  { label: "Home", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Review", icon: Brain, href: "/dashboard/review" },
  { label: "Path", icon: Route, href: "/dashboard/levels" },
  { label: "Stats", icon: BarChart3, href: "/dashboard/analytics" },
  { label: "Profile", icon: User, href: "/dashboard/profile" },
];

export function BottomNav({ dueReviews = 0 }: { dueReviews?: number }) {
  const pathname = usePathname();

  return (
    <nav className="safe-area-pb fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/90 backdrop-blur-xl md:hidden dark:border-gray-800 dark:bg-gray-900/90">
      <div className="flex items-center justify-around px-1 py-1">
        {bottomNavItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : (pathname ?? "").startsWith(item.href);
          const showBadge = item.href === "/dashboard/review" && dueReviews > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-w-[56px] flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-all duration-200 ${
                isActive
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <div
                className={`relative transition-transform duration-200 ${isActive ? "scale-110" : ""}`}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {showBadge && (
                  <span
                    className="absolute -right-2 -top-1.5 min-w-[16px] rounded-full bg-primary-500 px-1 text-center text-[9px] font-bold leading-4 text-white ring-2 ring-white dark:ring-gray-900"
                    aria-label={`${dueReviews} reviews due`}
                  >
                    {dueReviews > 9 ? "9+" : dueReviews}
                  </span>
                )}
                {isActive && !showBadge && (
                  <span className="gradient-bg-primary absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full" />
                )}
              </div>
              <span
                className={`text-[10px] font-medium transition-all duration-200 ${isActive ? "font-bold" : ""}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
