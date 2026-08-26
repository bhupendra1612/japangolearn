"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { Badge } from "@japangolearn/ui";
import { ADMIN_SECTIONS } from "@/lib/admin-sections";
import { getSectionIcon, OverviewIcon, TeachersIcon } from "@/components/section-icons";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean | "true" | "false" }>;
};

function buildNavItems(teacherReviewEnabled: boolean): NavItem[] {
  return [
    { href: "/", label: "Overview", icon: OverviewIcon },
    ...(teacherReviewEnabled
      ? [{ href: "/teachers", label: "Teacher approvals", icon: TeachersIcon }]
      : []),
    ...ADMIN_SECTIONS.map((section) => ({
      href: `/${section.key}`,
      label: section.label,
      icon: getSectionIcon(section.key),
    })),
  ];
}

/** Exact match for the overview, prefix match everywhere else. */
function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminChrome({
  displayName,
  teacherReviewEnabled,
  children,
}: {
  displayName: string;
  teacherReviewEnabled: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [renderedPath, setRenderedPath] = useState(pathname);
  const sidebarRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navItems = buildNavItems(teacherReviewEnabled);
  const activeItem = navItems.find((item) => isActive(pathname, item.href));

  /* Navigating from inside the drawer must close it — the route changes but the
     component stays mounted, so nothing else would. Adjusting during render
     rather than in an effect avoids a second paint with the drawer still open,
     and unlike an onClick on each link it also covers back/forward. */
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    if (drawerOpen) setDrawerOpen(false);
  }

  useEffect(() => {
    if (!drawerOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };

    /* Locking the body stops the page behind the drawer scrolling under it. */
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    /* Keyboard and screen-reader users land inside the drawer they just opened
       rather than continuing from the hamburger, which sits behind the
       backdrop. Closing hands focus back to that hamburger. */
    const opener = toggleRef.current;
    sidebarRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [drawerOpen]);

  return (
    <div className="admin-frame">
      {drawerOpen && (
        <button
          type="button"
          className="drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside className="sidebar" data-open={drawerOpen} id="admin-navigation" ref={sidebarRef}>
        <Link href="/" className="brand">
          <span className="brand-mark">日</span>
          <span>
            <strong>JapanGoLearn</strong>
            <small>Admin console</small>
          </span>
        </Link>

        <p className="nav-section-label">Sections</p>
        <nav className="nav-list" aria-label="Admin sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link"
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <form action="/auth/signout" method="post">
            <button className="secondary-button" type="submit" style={{ width: "100%" }}>
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="workspace">
        <header className="app-header">
          <div className="header-left">
            <button
              type="button"
              className="nav-toggle"
              ref={toggleRef}
              onClick={() => setDrawerOpen((open) => !open)}
              aria-expanded={drawerOpen}
              aria-controls="admin-navigation"
              aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
            >
              {drawerOpen ? (
                <X size={20} aria-hidden="true" />
              ) : (
                <Menu size={20} aria-hidden="true" />
              )}
            </button>
            <h1 className="header-title">{activeItem?.label ?? "Admin console"}</h1>
          </div>

          <div className="header-actions">
            <Badge tone="info">{displayName}</Badge>
            <ThemeToggle />
          </div>
        </header>

        <main className="page-body">{children}</main>
      </div>
    </div>
  );
}
