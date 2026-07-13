import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { OnboardingModal } from "@/components/dashboard/onboarding-modal";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, current_jlpt_level, xp, streak_days, onboarding_completed")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "Learner";

  return (
    <DashboardShell
      displayName={displayName}
      xp={profile?.xp ?? 0}
      streak={profile?.streak_days ?? 0}
      jlptLevel={profile?.current_jlpt_level ?? "N5"}
    >
      {!profile?.onboarding_completed && !profile?.display_name && <OnboardingModal />}
      {children}
    </DashboardShell>
  );
}
