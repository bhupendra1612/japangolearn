"use client";

import { useState, useEffect } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopBar } from "@/components/dashboard/topbar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { DashboardNotification } from "@/lib/insights";

interface DashboardShellProps {
  children: React.ReactNode;
  displayName: string;
  xp: number;
  streak: number;
  jlptLevel: string;
  /** Items due now; badges the Review entry in both navigations. */
  dueReviews?: number;
  notifications?: DashboardNotification[];
}

const SIDEBAR_KEY = "ej_sidebar_collapsed";

export function DashboardShell({
  children,
  displayName,
  xp,
  streak,
  jlptLevel,
  dueReviews = 0,
  notifications = [],
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Persist sidebar state
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved !== null) setCollapsed(saved === "true");
  }, []);

  const handleToggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_KEY, String(next));
  };

  return (
    <ToastProvider>
      <div className="flex h-screen bg-slate-100 dark:bg-gray-950 overflow-hidden">
        {/* Desktop Sidebar */}
        <DashboardSidebar collapsed={collapsed} onToggle={handleToggle} dueReviews={dueReviews} />

        {/* Mobile Sidebar Drawer */}
        <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

        {/* Main area: topbar + scrollable content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <DashboardTopBar
            displayName={displayName}
            xp={xp}
            streak={streak}
            jlptLevel={jlptLevel}
            onMobileMenuToggle={() => setMobileOpen((o) => !o)}
            mobileMenuOpen={mobileOpen}
            notifications={notifications}
          />

          {/* Scrollable content */}
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNav dueReviews={dueReviews} />
      </div>
    </ToastProvider>
  );
}
