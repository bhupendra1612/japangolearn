import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LevelCard, type LevelData } from "@/components/dashboard/level-card";
import { ChevronRight, Map } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const LEVEL_META: Record<
  string,
  { kanji: string; color: string; description: string; order: number }
> = {
  N5: {
    kanji: "入",
    color: "from-green-400 to-emerald-500",
    description:
      "Your first step into Japanese. Learn hiragana, katakana, basic kanji, and essential everyday phrases.",
    order: 0,
  },
  N4: {
    kanji: "学",
    color: "from-cyan-400 to-blue-500",
    description:
      "Build your foundation with more kanji, grammar patterns, and the ability to understand basic conversations.",
    order: 1,
  },
  N3: {
    kanji: "語",
    color: "from-violet-400 to-purple-500",
    description:
      "The bridge to fluency. Handle daily situations, read simple articles, and express opinions in Japanese.",
    order: 2,
  },
  N2: {
    kanji: "読",
    color: "from-pink-400 to-rose-500",
    description:
      "Advanced proficiency. Read newspapers, understand natural-speed speech, and write formal documents.",
    order: 3,
  },
  N1: {
    kanji: "極",
    color: "from-amber-400 to-orange-500",
    description:
      "The ultimate level. Near-native fluency — comprehend complex texts, nuanced speech, and abstract topics.",
    order: 4,
  },
};

export default async function LevelsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Parallel fetches
  const [{ data: profile }, { data: jlptLevels }, { data: userProgress }] = await Promise.all([
    supabase.from("profiles").select("current_jlpt_level").eq("id", user.id).single(),

    supabase.from("jlpt_levels").select("*").order("order_index"),

    supabase
      .from("user_level_progress")
      .select("jlpt_level, progress_percent, completed_at")
      .eq("user_id", user.id),
  ]);

  const currentLevel = profile?.current_jlpt_level ?? "N5";

  // Build progress map
  const progressMap: Record<string, { progress: number; completed: boolean }> = {};
  userProgress?.forEach((row) => {
    progressMap[row.jlpt_level] = {
      progress: Number(row.progress_percent) || 0,
      completed: !!row.completed_at,
    };
  });

  // Determine level ordering: find current level index
  const levelOrder = ["N5", "N4", "N3", "N2", "N1"];
  const currentIdx = levelOrder.indexOf(currentLevel);

  // Build level cards data
  const levels: LevelData[] = levelOrder.map((id, idx) => {
    const meta = LEVEL_META[id];
    const dbLevel = jlptLevels?.find((l) => l.id === id);
    const prog = progressMap[id];
    const isCompleted = prog?.completed ?? false;
    const isActive = id === currentLevel;
    const isLocked = idx > currentIdx && !isCompleted;

    return {
      id,
      kanji: meta.kanji,
      name: dbLevel?.name ?? `JLPT ${id}`,
      description: meta.description,
      total_kanji: dbLevel?.total_kanji ?? 0,
      total_vocabulary: dbLevel?.total_vocabulary ?? 0,
      total_grammar: dbLevel?.total_grammar ?? 0,
      color: meta.color,
      progress: isCompleted ? 100 : (prog?.progress ?? (isActive ? 5 : 0)),
      status: isCompleted ? "completed" : isActive ? "active" : isLocked ? "locked" : "active",
      lessons_completed: Math.round(
        ((isCompleted ? 100 : (prog?.progress ?? 0)) / 100) *
          ((dbLevel?.total_kanji ?? 0) + (dbLevel?.total_grammar ?? 0))
      ),
      total_lessons: (dbLevel?.total_kanji ?? 0) + (dbLevel?.total_grammar ?? 0),
    };
  });

  // Stats
  const totalProgress = levels.reduce((sum, l) => sum + l.progress, 0) / levels.length;
  const completedCount = levels.filter((l) => l.status === "completed").length;

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
        <span className="font-medium text-gray-900 dark:text-gray-100">Learning Path</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl gradient-bg-primary text-white flex items-center justify-center">
              <Map className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">
              Learning <span className="gradient-text">Path</span>
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400">
            Your journey from beginner to fluency — JLPT N5 → N1
          </p>
        </div>

        {/* Overall progress card */}
        <div className="flex items-center gap-4 px-5 py-3 rounded-2xl bg-white/80 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 shrink-0 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-2xl font-bold gradient-text">{Math.round(totalProgress)}%</p>
            <p className="text-xs text-gray-400">Overall</p>
          </div>
          <div className="w-px h-10 bg-slate-200 dark:bg-gray-700" />
          <div className="text-center">
            <p className="text-2xl font-bold">
              {completedCount}
              <span className="text-sm text-gray-400 font-normal">/5</span>
            </p>
            <p className="text-xs text-gray-400">Levels</p>
          </div>
          <div className="w-px h-10 bg-slate-200 dark:bg-gray-700" />
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {currentLevel}
            </p>
            <p className="text-xs text-gray-400">Current</p>
          </div>
        </div>
      </div>

      {/* Horizontal roadmap connector (desktop) */}
      <div className="hidden lg:flex items-center justify-center gap-0 mb-8 px-8">
        {levels.map((level, idx) => (
          <div key={level.id} className="flex items-center">
            {/* Node */}
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-jp font-bold shadow transition-all ${
                level.status === "completed"
                  ? `bg-gradient-to-br ${level.color} text-white ring-4 ring-green-200 dark:ring-green-800`
                  : level.status === "active"
                    ? `bg-gradient-to-br ${level.color} text-white ring-4 ring-primary-200 dark:ring-primary-700 animate-pulse`
                    : "bg-slate-200 dark:bg-gray-700 text-gray-400"
              }`}
            >
              {level.status === "locked" ? "🔒" : level.kanji}
            </div>

            {/* Connector line */}
            {idx < levels.length - 1 && (
              <div
                className={`w-16 xl:w-24 h-1 rounded-full mx-1 transition-all duration-500 ${
                  levels[idx + 1].status !== "locked"
                    ? `bg-gradient-to-r ${level.color}`
                    : "bg-slate-200 dark:bg-gray-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Level cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {levels.map((level, index) => (
          <LevelCard key={level.id} level={level} index={index} />
        ))}
      </div>

      {/* Bottom motivational */}
      <div className="mt-10 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500 font-jp">
          千里の道も一歩から — A journey of a thousand miles begins with a single step.
        </p>
      </div>
    </div>
  );
}
