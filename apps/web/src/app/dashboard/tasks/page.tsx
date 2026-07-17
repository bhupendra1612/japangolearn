import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Zap, Flame, Target, Calendar, TrendingUp } from "lucide-react";
import { DailyTasks } from "@/components/dashboard/daily-tasks";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  const [
    { data: profile },
    { data: todayGoal },
    { data: todayActivities },
    { data: questCompletions },
    { data: weekGoals },
  ] = await Promise.all([
    supabase.from("profiles").select("xp, streak_days").eq("id", user.id).single(),

    supabase
      .from("daily_goals")
      .select("xp_earned, xp_target, tasks_completed, tasks_total")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle(),

    supabase
      .from("activity_log")
      .select("id, type, title, xp_earned, created_at")
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00`)
      .order("created_at", { ascending: false }),

    supabase
      .from("daily_quest_completions")
      .select("quest_key")
      .eq("user_id", user.id)
      .eq("quest_date", today),

    // Last 7 days of daily goals for the weekly streak row
    supabase
      .from("daily_goals")
      .select("date, xp_earned, xp_target, tasks_completed, tasks_total")
      .eq("user_id", user.id)
      .gte("date", new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0])
      .order("date", { ascending: true }),
  ]);

  const xp = profile?.xp ?? 0;
  const streak = profile?.streak_days ?? 0;
  const dailyXp = todayGoal?.xp_earned ?? 0;
  const dailyTarget = todayGoal?.xp_target ?? 100;
  const tasksCompleted = todayGoal?.tasks_completed ?? 0;
  const tasksTotal = todayGoal?.tasks_total ?? 3;
  const pct = Math.min(100, Math.round((dailyXp / dailyTarget) * 100));

  // Build week streak dots
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const dateStr = d.toISOString().split("T")[0];
    const dayLabel = d.toLocaleDateString("en", { weekday: "short" });
    const goal = weekGoals?.find((g) => g.date === dateStr);
    const isToday = dateStr === today;
    return { dateStr, dayLabel, goal, isToday };
  });

  const completedTypes = (questCompletions ?? []).map((quest) => quest.quest_key);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">
            Today&apos;s <span className="gradient-text">Tasks</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Complete daily quests to earn XP and maintain your streak
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              icon: Zap,
              label: "Today's XP",
              value: `${dailyXp}/${dailyTarget}`,
              color: "text-yellow-500",
              bg: "bg-yellow-50 dark:bg-yellow-900/20",
            },
            {
              icon: Target,
              label: "Tasks Done",
              value: `${tasksCompleted}/${tasksTotal}`,
              color: "text-primary-500",
              bg: "bg-primary-50 dark:bg-primary-900/20",
            },
            {
              icon: Flame,
              label: "Streak",
              value: `${streak} days`,
              color: "text-orange-500",
              bg: "bg-orange-50 dark:bg-orange-900/20",
            },
            {
              icon: TrendingUp,
              label: "Total XP",
              value: xp.toLocaleString(),
              color: "text-emerald-500",
              bg: "bg-emerald-50 dark:bg-emerald-900/20",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700"
            >
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* XP progress bar */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">Daily XP Progress</span>
            <span className="text-sm text-gray-500">{pct}%</span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full gradient-bg-primary rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {dailyXp} / {dailyTarget} XP earned today
          </p>
        </div>

        {/* Weekly streak overview */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold">This Week</span>
          </div>
          <div className="flex items-center justify-between gap-1">
            {weekDays.map((d) => {
              const hasActivity = !!d.goal && d.goal.xp_earned > 0;
              const goalMet = !!d.goal && d.goal.xp_earned >= d.goal.xp_target;
              return (
                <div key={d.dateStr} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`text-[10px] font-medium ${d.isToday ? "text-primary-600 dark:text-primary-400" : "text-gray-400"}`}
                  >
                    {d.dayLabel}
                  </span>
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                      goalMet
                        ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 ring-2 ring-green-500/30"
                        : hasActivity
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                          : d.isToday
                            ? "bg-primary-50 dark:bg-primary-900/20 text-primary-500 ring-2 ring-primary-500/30"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600"
                    }`}
                  >
                    {goalMet ? "✓" : hasActivity ? d.goal!.xp_earned : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Quests */}
        <DailyTasks initialCompleted={completedTypes} />

        {/* Today's Activity Log */}
        {(todayActivities ?? []).length > 0 && (
          <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold mb-3">Today&apos;s Activity</h3>
            <div className="space-y-2">
              {(todayActivities ?? []).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 dark:bg-gray-900/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {a.type === "vocabulary"
                        ? "📚"
                        : a.type === "kanji"
                          ? "✍️"
                          : a.type === "grammar"
                            ? "📝"
                            : "⭐"}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(a.created_at).toLocaleTimeString("en", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg">
                    +{a.xp_earned} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
