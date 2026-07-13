import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Star, Flame, Target, Trophy } from "lucide-react";
import { WelcomeHero } from "@/components/dashboard/welcome-hero";
import { DailyTasks } from "@/components/dashboard/daily-tasks";
import { MiniHeatmap } from "@/components/dashboard/mini-heatmap";
import { RecentActivity } from "@/components/dashboard/recent-activity";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Parallel fetches for performance
  const [
    { data: profile },
    { data: todayGoal },
    { data: activities },
    { data: heatmapRaw },
    { count: achievementCount },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, current_jlpt_level, xp, streak_days, role")
      .eq("id", user.id)
      .single(),

    supabase
      .from("daily_goals")
      .select("xp_earned, xp_target, tasks_completed, tasks_total")
      .eq("user_id", user.id)
      .eq("date", new Date().toISOString().split("T")[0])
      .maybeSingle(),

    supabase
      .from("activity_log")
      .select("id, type, title, description, xp_earned, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),

    // Get last 49 days for 7-week heatmap
    supabase
      .from("activity_log")
      .select("created_at")
      .eq("user_id", user.id)
      .gte("created_at", new Date(Date.now() - 49 * 24 * 60 * 60 * 1000).toISOString()),

    supabase
      .from("user_achievements")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.email?.split("@")[0] ||
    "Learner";
  const currentLevel = profile?.current_jlpt_level ?? "N5";
  const xp = profile?.xp ?? 0;
  const streak = profile?.streak_days ?? 0;
  const dailyXpEarned = todayGoal?.xp_earned ?? 0;
  const dailyXpTarget = todayGoal?.xp_target ?? 100;

  // Process heatmap: count activities per date
  const heatmapData: { date: string; count: number }[] = [];
  if (heatmapRaw) {
    const countByDate: Record<string, number> = {};
    heatmapRaw.forEach((row) => {
      const date = row.created_at.split("T")[0];
      countByDate[date] = (countByDate[date] ?? 0) + 1;
    });
    Object.entries(countByDate).forEach(([date, count]) => {
      heatmapData.push({ date, count });
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="space-y-6">
        {/* Welcome Hero */}
        <WelcomeHero
          displayName={displayName}
          xp={xp}
          streak={streak}
          jlptLevel={currentLevel}
          dailyXpEarned={dailyXpEarned}
          dailyXpTarget={dailyXpTarget}
        />

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
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
          ].map((stat) => (
            <div
              key={stat.label}
              className={`p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 ${stat.border} hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group`}
            >
              <div
                className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
              >
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Today's Quests */}
        <DailyTasks
          initialCompleted={Array.from(
            new Set(
              (activities ?? [])
                .filter((a) => a.created_at.startsWith(new Date().toISOString().split("T")[0]))
                .map((a) => a.type)
            )
          )}
        />

        {/* Heatmap + Activity — side by side on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MiniHeatmap data={heatmapData} weeks={7} />
          <RecentActivity activities={activities ?? []} />
        </div>
      </div>
    </div>
  );
}
