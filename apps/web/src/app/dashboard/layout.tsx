import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { OnboardingModal } from "@/components/dashboard/onboarding-modal";
import { getReviewSummary } from "@/lib/reviews";
import { getNotifications } from "@/lib/insights";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // The profile is needed before notifications, because the read marker it
  // carries is what decides which of them count as unread.
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, current_jlpt_level, xp, streak_days, onboarding_completed, notifications_seen_at"
    )
    .eq("id", user.id)
    .single();

  const [reviewSummary, notifications] = await Promise.all([
    getReviewSummary(),
    getNotifications(profile?.notifications_seen_at ?? null),
  ]);

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
      dueReviews={reviewSummary.dueNow}
      notifications={notifications}
    >
      {!profile?.onboarding_completed && !profile?.display_name && <OnboardingModal />}
      {children}
    </DashboardShell>
  );
}
