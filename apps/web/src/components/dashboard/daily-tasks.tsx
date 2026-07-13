"use client";

import { useState } from "react";
import {
  BookOpen,
  PenTool,
  FileText,
  Headphones,
  CheckCircle2,
  Clock,
  Zap,
  ChevronRight,
} from "lucide-react";

const TASKS = [
  {
    id: "vocabulary",
    title: "Vocabulary Practice",
    subtitle: "Learn 10 new words",
    icon: BookOpen,
    duration: 10,
    xp: 25,
    difficulty: "Easy" as const,
    color: "from-green-400 to-emerald-500",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    href: "/dashboard/vocabulary",
  },
  {
    id: "kanji",
    title: "Kanji Stroke Practice",
    subtitle: "Practice stroke order",
    icon: PenTool,
    duration: 15,
    xp: 35,
    difficulty: "Medium" as const,
    color: "from-violet-400 to-violet-600",
    bgColor: "bg-violet-50 dark:bg-violet-900/20",
    href: "/dashboard/writing",
  },
  {
    id: "grammar",
    title: "Grammar Lesson",
    subtitle: "Master a grammar point",
    icon: FileText,
    duration: 20,
    xp: 40,
    difficulty: "Medium" as const,
    color: "from-primary-400 to-primary-600",
    bgColor: "bg-primary-50 dark:bg-primary-900/20",
    href: "/dashboard/grammar",
  },
  {
    id: "listening",
    title: "Listening Exercise",
    subtitle: "Train your ear",
    icon: Headphones,
    duration: 10,
    xp: 30,
    difficulty: "Easy" as const,
    color: "from-cyan-400 to-blue-500",
    bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
    href: "/dashboard/tasks",
  },
];

const DIFFICULTY_COLOR = {
  Easy: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
  Medium: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
  Hard: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
};

export function DailyTasks({ initialCompleted = [] }: { initialCompleted?: string[] }) {
  const [completed, setCompleted] = useState<Set<string>>(new Set(initialCompleted));
  const [loading, setLoading] = useState<string | null>(null);

  const toggleDone = async (task: (typeof TASKS)[0]) => {
    if (completed.has(task.id) || loading) return; // Only allow completing once per day for now

    setLoading(task.id);
    try {
      // Import dynamically or normally. Since this is a client component, we should import the server action at the top.
      const { awardXp, updateDailyTaskProgress } = await import("@/app/actions/gamification");

      const res = await awardXp({
        type: task.id,
        title: `Completed ${task.title}`,
        xpAmount: task.xp,
      });

      if (res.success) {
        await updateDailyTaskProgress({ taskId: task.id, xpAmount: task.xp });
        setCompleted((prev) => {
          const next = new Set(prev);
          next.add(task.id);
          return next;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  const totalXp = TASKS.filter((t) => completed.has(t.id)).reduce((sum, t) => sum + t.xp, 0);

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">Today&apos;s Quests</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {completed.size}/{TASKS.length} completed
            {totalXp > 0 && (
              <span className="ml-2 text-yellow-600 dark:text-yellow-400 font-semibold">
                +{totalXp} XP earned
              </span>
            )}
          </p>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {TASKS.map((t) => (
            <div
              key={t.id}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                completed.has(t.id) ? "bg-green-500 scale-110" : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Task cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TASKS.map((task) => {
          const isDone = completed.has(task.id);
          return (
            <div
              key={task.id}
              className={`group relative flex flex-col gap-4 p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                isDone
                  ? "bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 opacity-75"
                  : "bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700"
              }`}
            >
              {/* Done overlay tick */}
              {isDone && (
                <div className="absolute top-4 right-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
              )}

              {/* Icon + title */}
              <div className="flex items-start gap-3">
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${task.color} text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}
                >
                  <task.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold ${isDone ? "line-through text-gray-400" : ""}`}>
                    {task.title}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{task.subtitle}</p>
                </div>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                  <Clock className="w-3 h-3" />
                  {task.duration} min
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-lg">
                  <Zap className="w-3 h-3" />+{task.xp} XP
                </span>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-lg ${DIFFICULTY_COLOR[task.difficulty]}`}
                >
                  {task.difficulty}
                </span>
              </div>

              {/* Action row */}
              <div className="flex items-center gap-2 mt-auto">
                <a
                  href={task.href}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-2 rounded-xl transition-all duration-200 ${
                    isDone
                      ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "gradient-bg-primary text-white hover:opacity-90 hover:shadow-md"
                  }`}
                  onClick={isDone ? (e) => e.preventDefault() : undefined}
                >
                  {isDone ? "Completed" : "Quick Start"}
                  {!isDone && <ChevronRight className="w-4 h-4" />}
                </a>
                {/* Mark done toggle */}
                <button
                  onClick={() => toggleDone(task)}
                  disabled={isDone || loading === task.id}
                  className={`p-2 rounded-xl border transition-all duration-200 ${
                    isDone
                      ? "border-green-300 dark:border-green-700 text-green-500 bg-green-50 dark:bg-green-900/20"
                      : "border-gray-200 dark:border-gray-700 text-gray-400 hover:border-green-300 hover:text-green-500"
                  } ${loading === task.id ? "opacity-50 cursor-not-allowed" : ""}`}
                  title={isDone ? "Completed" : "Mark complete"}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
