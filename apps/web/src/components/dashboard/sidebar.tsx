"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Route,
  BarChart3,
  Trophy,
  Bot,
  User,
  BookOpen,
  BookText,
  PenLine,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { featureFlags } from "@/lib/feature-flags";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Learning Path", icon: Route, href: "/dashboard/levels" },
  { label: "Writing", icon: PenLine, href: "/dashboard/writing" },
  { label: "Vocabulary", icon: BookOpen, href: "/dashboard/vocabulary" },
  { label: "Grammar", icon: BookText, href: "/dashboard/grammar" },
  { label: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
  { label: "Achievements", icon: Trophy, href: "/dashboard/achievements" },
  { label: "AI Practice", icon: Bot, href: "/dashboard/ai-practice", premium: true },
  { label: "Profile", icon: User, href: "/dashboard/profile" },
].filter(
  (item) =>
    item.href !== "/dashboard/ai-practice" || (featureFlags.aiPractice && featureFlags.premium)
);

interface DashboardSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function DashboardSidebar({ collapsed, onToggle }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`hidden md:flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out ${
        collapsed ? "w-[68px]" : "w-[220px]"
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          {collapsed ? (
            <Image
              src="/icon-192x192.png"
              alt="JapanGoLearn"
              width={32}
              height={32}
              className="rounded-xl shrink-0"
            />
          ) : (
            <Image
              src="/japangolearn_logo.webp"
              alt="JapanGoLearn Logo"
              width={130}
              height={36}
              className="h-9 w-auto object-contain"
            />
          )}
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : (pathname ?? "").startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full gradient-bg-primary" />
              )}

              <item.icon
                className={`shrink-0 w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-primary-600 dark:text-primary-400" : ""
                }`}
              />

              <span
                className={`whitespace-nowrap transition-all duration-200 ${
                  collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                }`}
              >
                {item.label}
              </span>

              {/* Premium badge */}
              {item.premium && !collapsed && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md gradient-bg-primary text-white">
                  PRO
                </span>
              )}

              {/* Tooltip when collapsed */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {item.label}
                  {item.premium && " ✨"}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle Button */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-800 shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 group"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span
                className={`transition-all duration-200 ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}
              >
                Collapse
              </span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
