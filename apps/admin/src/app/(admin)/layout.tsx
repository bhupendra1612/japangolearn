import { AdminShell } from "@/components/admin-shell";
import { requireAdmin } from "@/lib/auth";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();

  return <AdminShell profile={profile}>{children}</AdminShell>;
}
