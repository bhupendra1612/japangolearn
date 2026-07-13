"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X, LayoutDashboard, Route, BarChart3, Trophy, Bot, User } from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Learning Path", icon: Route, href: "/dashboard/levels" },
  { label: "Analytics", icon: BarChart3, href: "/dashboard/analytics" },
  { label: "Achievements", icon: Trophy, href: "/dashboard/achievements" },
  { label: "AI Practice", icon: Bot, href: "/dashboard/ai-practice", premium: true },
  { label: "Profile", icon: User, href: "/dashboard/profile" },
];

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-300 ease-in-out md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2">
            <Image
              src="/japangolearn_logo.webp"
              alt="JapanGoLearn Logo"
              width={120}
              height={34}
              className="h-8 w-auto object-contain"
            />
          </Link>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : (pathname ?? "").startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full gradient-bg-primary" />
                )}
                <item.icon
                  className={`shrink-0 w-5 h-5 ${isActive ? "text-primary-600 dark:text-primary-400" : ""}`}
                />
                <span>{item.label}</span>
                {item.premium && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md gradient-bg-primary text-white">
                    PRO
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
