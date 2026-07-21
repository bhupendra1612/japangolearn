import Link from "next/link";
import { BookOpen, PenTool, FileText, CheckCircle2, Clock, Zap, ChevronRight } from "lucide-react";

const TASKS = [
  {
    id: "vocabulary",
    title: "Vocabulary Practice",
    subtitle: "Complete a scored vocabulary quiz",
    icon: BookOpen,
    duration: 10,
    xp: "Up to 50 XP",
    difficulty: "Easy" as const,
    color: "from-green-400 to-emerald-500",
    href: "/dashboard/vocabulary",
  },
  {
    id: "kanji",
    title: "Writing Practice",
    subtitle: "Complete a scored writing quiz",
    icon: PenTool,
    duration: 15,
    xp: "5 XP per correct answer",
    difficulty: "Medium" as const,
    color: "from-violet-400 to-violet-600",
    href: "/dashboard/writing",
  },
  {
    id: "grammar",
    title: "Grammar Practice",
    subtitle: "Complete a scored grammar quiz",
    icon: FileText,
    duration: 15,
    xp: "Up to 50 XP",
    difficulty: "Medium" as const,
    color: "from-primary-400 to-primary-600",
    href: "/dashboard/grammar",
  },
] as const;

const DIFFICULTY_COLOR = {
  Easy: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
  Medium: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
};

export function DailyTasks({ initialCompleted = [] }: { initialCompleted?: string[] }) {
  const completed = new Set(initialCompleted);

  return (
    <section aria-labelledby="daily-quests-heading">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 id="daily-quests-heading" className="text-xl font-bold">
            Today&apos;s Quests
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {completed.size}/{TASKS.length} verified attempts completed
          </p>
        </div>
        <div
          className="flex gap-1.5"
          role="img"
          aria-label={`${completed.size} of ${TASKS.length} daily quests complete`}
        >
          {TASKS.map((task) => (
            <span
              key={task.id}
              className={`h-2.5 w-2.5 rounded-full ${
                completed.has(task.id) ? "scale-110 bg-green-500" : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {TASKS.map((task) => {
          const isDone = completed.has(task.id);
          return (
            <article
              key={task.id}
              className={`group relative flex flex-col gap-4 rounded-2xl border p-5 transition-all duration-300 ${
                isDone
                  ? "border-gray-200 bg-gray-50 opacity-75 dark:border-gray-700 dark:bg-gray-800/30"
                  : "border-gray-200 bg-white hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/60"
              }`}
            >
              {isDone && (
                <CheckCircle2
                  className="absolute right-4 top-4 h-5 w-5 text-green-500"
                  aria-label="Completed"
                />
              )}

              <div className="flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${task.color} text-white`}
                >
                  <task.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={`font-semibold ${isDone ? "text-gray-400 line-through" : ""}`}>
                    {task.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{task.subtitle}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {task.duration} min
                </span>
                <span className="flex items-center gap-1 rounded-lg bg-yellow-50 px-2 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                  <Zap className="h-3 w-3" aria-hidden="true" />
                  {task.xp}
                </span>
                <span
                  className={`rounded-lg px-2 py-1 text-xs font-medium ${DIFFICULTY_COLOR[task.difficulty]}`}
                >
                  {task.difficulty}
                </span>
              </div>

              <Link
                href={task.href}
                className={`mt-auto flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold ${
                  isDone
                    ? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
                    : "gradient-bg-primary text-white hover:opacity-90"
                }`}
              >
                {isDone ? "Practice again" : "Start quest"}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
