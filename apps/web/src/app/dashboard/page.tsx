import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Star, Flame, Target, Trophy, TriangleAlert } from "lucide-react";
import { WelcomeHero } from "@/components/dashboard/welcome-hero";
import { DailyTasks } from "@/components/dashboard/daily-tasks";
import { MiniHeatmap } from "@/components/dashboard/mini-heatmap";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { ReviewCard } from "@/components/dashboard/review-card";
import { FirstRunGuide } from "@/components/dashboard/first-run-guide";
import { getReviewSummary } from "@/lib/reviews";
import { getKanjiOfTheDay, getResumePoint } from "@/lib/insights";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const today = new Date().toISOString().split("T")[0];
  const [
    { data: profile, error: profileError },
    { data: todayGoal },
    { data: questCompletions },
    { data: activities },
    { data: heatmapRaw },
    { count: achievementCount },
    reviewSummary,
    resume,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, current_jlpt_level, xp, streak_days, role, streak_freezes")
      .eq("id", user.id)
      .single(),

    supabase
      .from("daily_goals")
      .select("xp_earned, xp_target, tasks_completed, tasks_total")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle(),

    supabase
      .from("daily_quest_completions")
      .select("quest_key")
      .eq("user_id", user.id)
      .eq("quest_date", today),

    supabase
      .from("activity_log")
      .select("id, type, title, description, xp_earned, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),

    /* Last 49 days for the 7-week heatmap. Counted from learning_attempts, the
       same source the analytics heatmap uses — reading activity_log here made
       the two pages show different numbers for the same picture. */
    supabase
      .from("learning_attempts")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("completed_at", new Date(Date.now() - 49 * 24 * 60 * 60 * 1000).toISOString()),

    supabase
      .from("user_achievements")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),

    getReviewSummary(),

    getResumePoint(),
  ]);

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "Learner";
  const currentLevel = profile?.current_jlpt_level ?? "N5";

  /* Depends on the level resolved above, so it cannot join the batch. */
  const dailyKanji = await getKanjiOfTheDay(currentLevel);

  /* No resume point means no completed attempt has ever been recorded — the
     one reliable signal that this account has not started. */
  const isFirstRun = resume === null && reviewSummary.trackedItems === 0;
  const xp = profile?.xp ?? 0;
  const streak = profile?.streak_days ?? 0;
  const dailyXpEarned = todayGoal?.xp_earned ?? 0;
  const dailyXpTarget = todayGoal?.xp_target ?? 100;

  // Process heatmap: count completed study sessions per date
  const heatmapData: { date: string; count: number }[] = [];
  if (heatmapRaw) {
    const countByDate: Record<string, number> = {};
    heatmapRaw.forEach((row) => {
      if (!row.completed_at) return;
      const date = row.completed_at.split("T")[0];
      countByDate[date] = (countByDate[date] ?? 0) + 1;
    });
    Object.entries(countByDate).forEach(([date, count]) => {
      heatmapData.push({ date, count });
    });
  }

  const stats = [
    {
      icon: Star,
      label: "Total XP",
      value: xp.toLocaleString(),
      color: "text-yellow-500",
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "hover:border-yellow-200 dark:hover:border-yellow-700",
    },
    {
      icon: Flame,
      label: "Day Streak",
      value: streak,
      color: "text-orange-500",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      border: "hover:border-orange-200 dark:hover:border-orange-700",
    },
    {
      icon: Target,
      label: "Current Level",
      value: currentLevel,
      color: "text-primary-500",
      bg: "bg-primary-50 dark:bg-primary-900/20",
      border: "hover:border-primary-200 dark:hover:border-primary-700",
    },
    {
      icon: Trophy,
      label: "Achievements",
      value: achievementCount ?? 0,
      color: "text-cyan-500",
      bg: "bg-cyan-50 dark:bg-cyan-900/20",
      border: "hover:border-cyan-200 dark:hover:border-cyan-700",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <div className="space-y-5 sm:space-y-6">
        {/* A failed profile read used to render silently as 0 XP / 0 streak,
            which reads as lost progress rather than a transient error. */}
        {profileError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800 dark:border-orange-900 dark:bg-orange-900/20 dark:text-orange-300"
          >
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              We could not load your profile just now, so some figures below may be out of date.
              Refresh to try again.
            </span>
          </div>
        )}

        <WelcomeHero
          displayName={displayName}
          xp={xp}
          streak={streak}
          jlptLevel={currentLevel}
          dailyXpEarned={dailyXpEarned}
          dailyXpTarget={dailyXpTarget}
          dailyKanji={
            dailyKanji && {
              id: dailyKanji.id,
              glyph: dailyKanji.glyph,
              meaning: dailyKanji.meaning,
              reading: dailyKanji.reading,
              jlptLevel: dailyKanji.jlptLevel,
              strokeCount: dailyKanji.strokeCount,
            }
          }
          resume={resume && { label: resume.label, href: resume.href }}
          streakFreezes={profile?.streak_freezes ?? 0}
        />

        {/* A learner with no completed activity gets a route in rather than a
            grid of zeros. Once anything is finished, the normal cards take over. */}
        {isFirstRun ? (
          <FirstRunGuide displayName={displayName} />
        ) : (
          /* Reviews sit directly under the hero: when something is due, it is the
             highest-value action on the page. */
          <ReviewCard summary={reviewSummary} />
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`group rounded-2xl border border-gray-200 bg-white p-3.5 transition-all duration-200 sm:p-4 dark:border-gray-700 dark:bg-gray-800/60 ${stat.border} hover:-translate-y-0.5 hover:shadow-md`}
            >
              <div
                className={`h-9 w-9 rounded-xl ${stat.bg} mb-2.5 flex items-center justify-center transition-transform group-hover:scale-110 sm:mb-3`}
              >
                <stat.icon className={`h-5 w-5 ${stat.color}`} aria-hidden="true" />
              </div>
              <p className="text-xl font-bold tabular-nums sm:text-2xl">{stat.value}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Today's Quests */}
        <DailyTasks initialCompleted={(questCompletions ?? []).map((quest) => quest.quest_key)} />

        {/* Heatmap + Activity — side by side on large screens */}
        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2">
          <MiniHeatmap data={heatmapData} weeks={7} />
          <RecentActivity activities={activities ?? []} />
        </div>
      </div>
    </div>
  );
}
