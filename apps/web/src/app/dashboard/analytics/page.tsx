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
import { getSkillBreakdown } from "@/lib/insights";
import type { MasteryItemType } from "@japangolearn/core";

export const dynamic = "force-dynamic";

/* The four content families that actually exist. The previous radar hardcoded
   "Listening" and "Lessons" axes that no web activity can fill, so every
   learner was permanently told to focus on a skill the product does not teach. */
const SKILL_AXES: { key: MasteryItemType; label: string }[] = [
  { key: "vocabulary", label: "Vocab" },
  { key: "kanji", label: "Kanji" },
  { key: "kana", label: "Kana" },
  { key: "grammar", label: "Grammar" },
];

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ninetyDaysAgo = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: profile }, { data: weeklyXpEntries }, { data: allAttempts }, skills] =
    await Promise.all([
      supabase.from("profiles").select("streak_days").eq("id", user.id).single(),

      supabase
        .from("xp_ledger")
        .select("amount, created_at")
        .eq("user_id", user.id)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false }),

      supabase
        .from("learning_attempts")
        .select("activity_type, correct_answers, total_questions, duration_seconds, completed_at")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .gte("completed_at", ninetyDaysAgo),

      getSkillBreakdown(),
    ]);

  const streak = profile?.streak_days ?? 0;

  // Build weekly XP chart data
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyXp: number[] = new Array(7).fill(0);
  weeklyXpEntries?.forEach((entry) => {
    const d = new Date(entry.created_at);
    let dayIdx = d.getDay() - 1; // Mon=0
    if (dayIdx < 0) dayIdx = 6; // Sun=6
    weeklyXp[dayIdx] += entry.amount;
  });
  const weeklyChartData = dayLabels.map((label, i) => ({ label, value: weeklyXp[i] }));
  const weeklyTotal = weeklyXp.reduce((s, v) => s + v, 0);

  /* Mastery per content family, not attempt counts. An axis the learner has
     never touched sits at 0 with tracked = 0, which is what lets the
     strongest/weakest comparison below ignore it instead of naming it a
     weakness. */
  const skillByType = new Map(skills.map((skill) => [skill.itemType, skill]));
  const skillRadarData = SKILL_AXES.map(({ key, label }) => ({
    label,
    value: skillByType.get(key)?.avgMastery ?? 0,
    max: 100,
  }));

  const studiedSkills = SKILL_AXES.map(({ key, label }) => ({
    label,
    skill: skillByType.get(key),
  })).filter((entry) => (entry.skill?.tracked ?? 0) > 0);

  const rankedSkills = [...studiedSkills].sort(
    (a, b) => (b.skill?.avgMastery ?? 0) - (a.skill?.avgMastery ?? 0)
  );
  /* Only meaningful once two families have been studied — with one, "strongest"
     and "weakest" would name the same thing. */
  const strongest = rankedSkills.length >= 2 ? rankedSkills[0] : null;
  const weakest = rankedSkills.length >= 2 ? rankedSkills[rankedSkills.length - 1] : null;
  const trackedItems = skills.reduce((total, skill) => total + skill.tracked, 0);

  const totalStudyMin = Math.round(
    (allAttempts ?? []).reduce((total, attempt) => total + (attempt.duration_seconds ?? 0), 0) / 60
  );
  const studyHours = Math.floor(totalStudyMin / 60);
  const studyMins = totalStudyMin % 60;

  const heatmapMap: Record<string, number> = {};
  allAttempts?.forEach((attempt) => {
    if (!attempt.completed_at) return;
    const date = attempt.completed_at.split("T")[0];
    heatmapMap[date] = (heatmapMap[date] ?? 0) + 1;
  });
  const heatmapData = Object.entries(heatmapMap).map(([date, count]) => ({ date, count }));

  // Accuracy (placeholder — future: track correct/incorrect)
  const totalAnswers = (allAttempts ?? []).reduce(
    (total, attempt) => total + attempt.total_questions,
    0
  );
  const correctAnswers = (allAttempts ?? []).reduce(
    (total, attempt) => total + attempt.correct_answers,
    0
  );
  const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

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
                {trackedItems > 0
                  ? `Average mastery across ${trackedItems.toLocaleString()} tracked item${trackedItems === 1 ? "" : "s"}`
                  : "Mastery builds as you answer quiz questions"}
              </p>
            </div>
          </div>

          {trackedItems > 0 ? (
            <>
              <SkillRadar skills={skillRadarData} size={220} />

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SKILL_AXES.map(({ key, label }) => {
                  const skill = skillByType.get(key);
                  return (
                    <div
                      key={key}
                      className="rounded-xl bg-gray-50 p-2.5 text-center dark:bg-gray-900/40"
                    >
                      <p className="text-[10px] uppercase tracking-wider text-gray-400">{label}</p>
                      <p className="text-sm font-bold tabular-nums">
                        {skill ? `${Math.round(skill.avgMastery)}%` : "—"}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {skill ? `${skill.tracked} tracked` : "not started"}
                      </p>
                    </div>
                  );
                })}
              </div>

              {strongest && weakest && (
                <div className="mt-4 flex gap-3">
                  <div className="flex-1 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
                      Strongest
                    </p>
                    <p className="text-sm font-bold">{strongest.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(strongest.skill?.accuracy ?? 0)}% accuracy
                    </p>
                  </div>
                  <div className="flex-1 rounded-xl border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                      Focus On
                    </p>
                    <p className="text-sm font-bold">{weakest.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(weakest.skill?.accuracy ?? 0)}% accuracy
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl bg-gray-50 px-4 py-10 text-center dark:bg-gray-900/40">
              <p className="text-3xl">🌱</p>
              <p className="mt-2 text-sm font-medium">No mastery data yet</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Finish a vocabulary, writing, or grammar quiz and each item you answer starts
                building a mastery score here.
              </p>
              <Link
                href="/dashboard/vocabulary"
                className="gradient-bg-primary mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Start a quiz
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Full Heatmap */}
      <div className="mb-6">
        <MiniHeatmap data={heatmapData} weeks={13} />
      </div>
    </div>
  );
}
