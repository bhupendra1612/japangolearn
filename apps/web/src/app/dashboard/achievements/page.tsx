import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Trophy, Star, Flame, Lock } from "lucide-react";
import { StreakCalendar } from "@/components/dashboard/streak-calendar";
import { ProgressRing } from "@/components/dashboard/progress-ring";

export const dynamic = "force-dynamic";

// XP levels: level N requires N*100 XP
function getXpLevel(xp: number): { level: number; current: number; needed: number } {
  let level = 1;
  let remaining = xp;
  while (remaining >= level * 100) {
    remaining -= level * 100;
    level++;
  }
  return { level, current: remaining, needed: level * 100 };
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xp_reward: number;
}

export default async function AchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: allAchievements },
    { data: userAchievements },
    { data: activityDates },
  ] = await Promise.all([
    supabase.from("profiles").select("xp, streak_days").eq("id", user.id).single(),
    supabase.from("achievements").select("*"),
    supabase.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", user.id),
    // Last 30 days activity for streak calendar
    supabase
      .from("activity_log")
      .select("created_at")
      .eq("user_id", user.id)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const xp = profile?.xp ?? 0;
  const streak = profile?.streak_days ?? 0;
  const xpLevel = getXpLevel(xp);

  const unlockedIds = new Set(userAchievements?.map((ua) => ua.achievement_id) ?? []);
  const unlockedCount = unlockedIds.size;
  const totalCount = allAchievements?.length ?? 0;

  // Build streak calendar data
  const activeDays = new Set<string>();
  activityDates?.forEach((a) => {
    activeDays.add(a.created_at.split("T")[0]);
  });

  // Group achievements by category
  const categories = ["milestone", "streak", "learning", "challenge"] as const;
  const categoryLabels: Record<string, string> = {
    milestone: "🏅 Milestones",
    streak: "🔥 Streak",
    learning: "📚 Learning",
    challenge: "⚡ Challenges",
  };

  const grouped: Record<string, Achievement[]> = {};
  categories.forEach((c) => {
    grouped[c] = [];
  });
  allAchievements?.forEach((a) => {
    if (grouped[a.category]) grouped[a.category].push(a);
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/dashboard" className="hover:text-primary-600 transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-medium text-gray-900 dark:text-gray-100">Achievements</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl gradient-bg-primary text-white flex items-center justify-center">
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            <span className="gradient-text">Achievements</span> & Streaks
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {unlockedCount}/{totalCount} badges earned
          </p>
        </div>
      </div>

      {/* Top row: XP Level + Streak */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* XP Level Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-5">
            <ProgressRing
              progress={(xpLevel.current / xpLevel.needed) * 100}
              size={90}
              strokeWidth={7}
              gradientId="xp-level-ring"
            >
              <div className="text-center">
                <p className="text-xl font-bold gradient-text">{xpLevel.level}</p>
                <p className="text-[9px] text-gray-400 uppercase">Level</p>
              </div>
            </ProgressRing>

            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1">XP Level {xpLevel.level}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {xpLevel.current.toLocaleString()} / {xpLevel.needed.toLocaleString()} XP to next
                level
              </p>
              <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full gradient-bg-primary transition-all duration-700"
                  style={{ width: `${(xpLevel.current / xpLevel.needed) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Total:{" "}
                <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                  {xp.toLocaleString()} XP
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Streak Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Flame
                  className={`w-5 h-5 ${streak > 0 ? "text-orange-500 animate-pulse" : "text-gray-400"}`}
                />
                Streak
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Last 30 days</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-orange-500">{streak}</p>
              <p className="text-xs text-gray-400">days</p>
            </div>
          </div>
          <StreakCalendar activeDays={activeDays} days={30} />
        </div>
      </div>

      {/* Achievement Badges by Category */}
      <div className="space-y-8">
        {categories.map((cat) => {
          const items = grouped[cat];
          if (!items || items.length === 0) return null;

          return (
            <section key={cat}>
              <h2 className="text-lg font-bold mb-4">{categoryLabels[cat]}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((ach) => {
                  const isUnlocked = unlockedIds.has(ach.id);
                  return (
                    <div
                      key={ach.id}
                      className={`group relative p-4 rounded-2xl border transition-all duration-300 ${
                        isUnlocked
                          ? "bg-white dark:bg-gray-800/60 border-primary-200 dark:border-primary-700 hover:-translate-y-0.5 hover:shadow-lg"
                          : "bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform duration-200 ${
                            isUnlocked
                              ? "bg-primary-50 dark:bg-primary-900/30 group-hover:scale-110"
                              : "bg-gray-100 dark:bg-gray-700 grayscale"
                          }`}
                        >
                          {isUnlocked ? ach.icon : <Lock className="w-5 h-5 text-gray-400" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p
                              className={`font-semibold text-sm ${!isUnlocked ? "text-gray-400" : ""}`}
                            >
                              {ach.name}
                            </p>
                            {isUnlocked && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                ✓
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            {ach.description}
                          </p>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                              +{ach.xp_reward} XP
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Motivational footer */}
      <div className="mt-10 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500 font-jp">
          七転び八起き — Fall seven times, stand up eight.
        </p>
      </div>
    </div>
  );
}
