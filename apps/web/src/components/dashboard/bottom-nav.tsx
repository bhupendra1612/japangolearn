"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Route, CheckSquare, BarChart3, User } from "lucide-react";

const bottomNavItems = [
  { label: "Home", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Path", icon: Route, href: "/dashboard/levels" },
  { label: "Tasks", icon: CheckSquare, href: "/dashboard/tasks" },
  { label: "Stats", icon: BarChart3, href: "/dashboard/analytics" },
  { label: "Profile", icon: User, href: "/dashboard/profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-1">
        {bottomNavItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : (pathname ?? "").startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[56px] ${
                isActive
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              <div
                className={`relative transition-transform duration-200 ${isActive ? "scale-110" : ""}`}
              >
                <item.icon className="w-5 h-5" />
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full gradient-bg-primary" />
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
