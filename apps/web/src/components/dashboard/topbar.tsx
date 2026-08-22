"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Settings, LogOut, ChevronDown, Flame, Sparkles, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell } from "@/components/dashboard/notification-bell";
import type { DashboardNotification } from "@/lib/insights";

interface DashboardTopBarProps {
  displayName: string;
  xp: number;
  streak: number;
  jlptLevel: string;
  onMobileMenuToggle: () => void;
  mobileMenuOpen: boolean;
  notifications: DashboardNotification[];
}

export function DashboardTopBar({
  displayName,
  xp,
  streak,
  jlptLevel,
  onMobileMenuToggle,
  mobileMenuOpen,
  notifications,
}: DashboardTopBarProps) {
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [displayXp, setDisplayXp] = useState(xp);
  const router = useRouter();
  const avatarRef = useRef<HTMLDivElement>(null);

  // Animate XP count-up when xp prop changes
  useEffect(() => {
    setDisplayXp(xp);
  }, [xp]);

  // Close the avatar menu on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 flex items-center gap-3 px-4 sm:px-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shrink-0 z-40">
      {/* Mobile hamburger */}
      <button
        onClick={onMobileMenuToggle}
        className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* JLPT Level Badge */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700">
        <span className="text-xs font-bold text-primary-700 dark:text-primary-300">JLPT</span>
        <span className="text-sm font-extrabold gradient-text">{jlptLevel}</span>
      </div>

      {/* XP Counter */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
        <Sparkles className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400 tabular-nums">
          {displayXp.toLocaleString()}
        </span>
        <span className="hidden sm:inline text-xs text-yellow-600 dark:text-yellow-500">XP</span>
      </div>

      {/* Streak */}
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
          streak > 0
            ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
            : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        }`}
      >
        <Flame
          className={`w-4 h-4 transition-all ${
            streak > 0 ? "text-orange-500 animate-pulse" : "text-gray-400"
          }`}
        />
        <span
          className={`text-sm font-bold tabular-nums ${
            streak > 0 ? "text-orange-700 dark:text-orange-400" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {streak}
        </span>
      </div>

      <NotificationBell notifications={notifications} />

      {/* Avatar Dropdown */}
      <div className="relative" ref={avatarRef}>
        <button
          onClick={() => setAvatarOpen(!avatarOpen)}
          className="flex items-center gap-2 p-1 pr-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
        >
          <div className="w-8 h-8 rounded-lg gradient-bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials || <User className="w-4 h-4" />}
          </div>
          <span className="hidden sm:inline text-sm font-medium max-w-[100px] truncate">
            {displayName}
          </span>
          <ChevronDown
            className={`hidden sm:block w-4 h-4 text-gray-400 transition-transform duration-200 ${
              avatarOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {avatarOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 overflow-hidden animate-scale-in">
            {/* User info */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                JLPT {jlptLevel} · {xp.toLocaleString()} XP
              </p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <Link
                href="/dashboard/profile"
                onClick={() => setAvatarOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
              <Link
                href="/dashboard/profile"
                onClick={() => setAvatarOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </div>

            <div className="py-1 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
