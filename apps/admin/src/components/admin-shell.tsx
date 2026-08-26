import type { AdminProfile } from "@/lib/auth";
import { teacherReviewEnabled } from "@/lib/marketplace";
import { AdminChrome } from "@/components/admin-chrome";

/**
 * Server half of the shell: resolves everything the chrome needs before handing
 * off, so the client bundle never imports the auth or feature-flag modules.
 */
export function AdminShell({
  profile,
  children,
}: {
  profile: AdminProfile;
  children: React.ReactNode;
}) {
  return (
    <AdminChrome
      displayName={profile.display_name ?? "Admin"}
      teacherReviewEnabled={teacherReviewEnabled}
    >
      {children}
    </AdminChrome>
  );
}
