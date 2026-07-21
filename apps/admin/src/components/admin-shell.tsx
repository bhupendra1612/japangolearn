import Link from "next/link";
import { ADMIN_SECTIONS } from "@/lib/admin-sections";
import type { AdminProfile } from "@/lib/auth";
import { Badge } from "@japangolearn/ui";

export function AdminShell({
  profile,
  children,
}: {
  profile: AdminProfile;
  children: React.ReactNode;
}) {
  const displayName = profile.display_name ?? "Admin";

  return (
    <div className="admin-frame">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">日</span>
          <span>
            <strong>JapanGoLearn</strong>
            <small>Admin</small>
          </span>
        </Link>
        <nav className="nav-list" aria-label="Admin sections">
          <Link href="/" className="nav-link">
            Overview
          </Link>
          {ADMIN_SECTIONS.map((section) => (
            <Link key={section.key} href={`/${section.key}`} className="nav-link">
              {section.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Role protected</p>
            <h1>Admin Console</h1>
          </div>
          <div className="topbar-actions">
            <Badge tone="info">{displayName}</Badge>
            <form action="/auth/signout" method="post">
              <button className="secondary-button" type="submit">
                Sign out
              </button>
            </form>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
