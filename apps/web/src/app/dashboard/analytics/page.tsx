import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Star,
  Flame,
} from "lucide-react";
import { SimpleBarChart } from "@/components/dashboard/bar-chart";
import { SkillRadar } from "@/components/dashboard/skill-radar";
import { MiniHeatmap } from "@/components/dashboard/mini-heatmap";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Parallel fetches
  const [{ data: profile }, { data: weeklyActivities }, { data: allActivities }] =
    await Promise.all([
      supabase.from("profiles").select("streak_days").eq("id", user.id).single(),

      // Last 7 days activity
      supabase
        .from("activity_log")
        .select("type, xp_earned, created_at")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false }),

      // Last 90 days for heatmap (13 weeks)
      supabase
        .from("activity_log")
        .select("type, xp_earned, created_at")
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

  const streak = profile?.streak_days ?? 0;

  // Build weekly XP chart data
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyXp: number[] = new Array(7).fill(0);
  weeklyActivities?.forEach((a) => {
    const d = new Date(a.created_at);
    let dayIdx = d.getDay() - 1; // Mon=0
    if (dayIdx < 0) dayIdx = 6; // Sun=6
    weeklyXp[dayIdx] += a.xp_earned;
  });
  const weeklyChartData = dayLabels.map((label, i) => ({ label, value: weeklyXp[i] }));
  const weeklyTotal = weeklyXp.reduce((s, v) => s + v, 0);

  // Skill breakdown from all activities
  const skillCounts: Record<string, number> = {
    vocabulary: 0,
    kanji: 0,
    grammar: 0,
    listening: 0,
    lesson: 0,
  };
  allActivities?.forEach((a) => {
    if (skillCounts[a.type] !== undefined) skillCounts[a.type] += 1;
  });
  const skillRadarData = [
    { label: "Vocab", value: skillCounts.vocabulary, max: 50 },
    { label: "Kanji", value: skillCounts.kanji, max: 50 },
    { label: "Grammar", value: skillCounts.grammar, max: 50 },
    { label: "Listening", value: skillCounts.listening, max: 50 },
    { label: "Lessons", value: skillCounts.lesson, max: 50 },
  ];

  // Find strongest / weakest
  const sorted = [...skillRadarData].sort((a, b) => b.value - a.value);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  // Study time estimate (10 min per activity)
  const totalStudyMin = (allActivities?.length ?? 0) * 10;
  const studyHours = Math.floor(totalStudyMin / 60);
  const studyMins = totalStudyMin % 60;

  // Heatmap data
  const heatmapMap: Record<string, number> = {};
  allActivities?.forEach((a) => {
    const date = a.created_at.split("T")[0];
    heatmapMap[date] = (heatmapMap[date] ?? 0) + 1;
  });
  const heatmapData = Object.entries(heatmapMap).map(([date, count]) => ({ date, count }));

  // Accuracy (placeholder — future: track correct/incorrect)
  const accuracy = allActivities && allActivities.length > 0 ? 85 : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link
          href="/dashboard"
          className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-medium text-gray-900 dark:text-gray-100">Analytics</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl gradient-bg-primary text-white flex items-center justify-center">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Progress <span className="gradient-text">Analytics</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track your learning performance
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            icon: Star,
            label: "Weekly XP",
            value: weeklyTotal,
            suffix: " XP",
            color: "text-yellow-500",
            bg: "bg-yellow-50 dark:bg-yellow-900/20",
          },
          {
            icon: Clock,
            label: "Study Time",
            value: `${studyHours}h ${studyMins}m`,
            suffix: "",
            color: "text-blue-500",
            bg: "bg-blue-50 dark:bg-blue-900/20",
          },
          {
            icon: Target,
            label: "Accuracy",
            value: accuracy,
            suffix: "%",
            color: "text-green-500",
            bg: "bg-green-50 dark:bg-green-900/20",
          },
          {
            icon: Flame,
            label: "Current Streak",
            value: streak,
            suffix: " days",
            color: "text-orange-500",
            bg: "bg-orange-50 dark:bg-orange-900/20",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="p-4 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
          >
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold">
              {s.value}
              {s.suffix}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Weekly XP Chart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold">Weekly XP</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {weeklyTotal} XP earned this week
              </p>
            </div>
            <div
              className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
                weeklyTotal > 0
                  ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
                  : "text-gray-400 bg-gray-50 dark:bg-gray-800"
              }`}
            >
              {weeklyTotal > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {weeklyTotal > 0 ? "Active" : "Start learning!"}
            </div>
          </div>
          <SimpleBarChart data={weeklyChartData} unit=" XP" />
        </div>

        {/* Skill Radar */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold">Skill Breakdown</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your strengths and areas to improve
              </p>
            </div>
          </div>
          <SkillRadar skills={skillRadarData} size={220} />
          {/* Strongest / Weakest */}
          <div className="flex gap-3 mt-4">
            <div className="flex-1 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-[10px] uppercase tracking-wider text-green-600 dark:text-green-400 font-semibold mb-0.5">
                Strongest
              </p>
              <p className="text-sm font-bold">{strongest.label}</p>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <p className="text-[10px] uppercase tracking-wider text-orange-600 dark:text-orange-400 font-semibold mb-0.5">
                Focus On
              </p>
              <p className="text-sm font-bold">{weakest.label}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Full Heatmap */}
      <div className="mb-6">
        <MiniHeatmap data={heatmapData} weeks={13} />
      </div>
    </div>
  );
}
