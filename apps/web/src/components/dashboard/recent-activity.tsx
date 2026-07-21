"use client";

import { useMemo } from "react";

interface ActivityEntry {
  id: string;
  type: string;
  title: string;
  description?: string;
  xp_earned: number;
  created_at: string;
}

interface RecentActivityProps {
  activities: ActivityEntry[];
}

const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  lesson: {
    emoji: "📖",
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  },
  kanji: {
    emoji: "✍️",
    color: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
  },
  xp: {
    emoji: "⭐",
    color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
  },
  streak: {
    emoji: "🔥",
    color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  },
  achievement: {
    emoji: "🏆",
    color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  },
  vocabulary: {
    emoji: "📚",
    color: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  },
  grammar: {
    emoji: "📝",
    color: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400",
  },
  listening: {
    emoji: "🎧",
    color: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
  },
};

function timeAgo(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(isoDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Placeholder activities when user has no activity yet
const PLACEHOLDER: ActivityEntry[] = [
  {
    id: "p1",
    type: "achievement",
    title: "Welcome to JapanGoLearn! 🎉",
    description: "Your journey begins today",
    xp_earned: 10,
    created_at: new Date().toISOString(),
  },
];

export function RecentActivity({ activities }: RecentActivityProps) {
  const items = useMemo(() => {
    const all = activities.length > 0 ? activities : PLACEHOLDER;
    return all.slice(0, 8);
  }, [activities]);

  return (
    <section className="p-5 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold">Recent Activity</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Your latest learning actions
          </p>
        </div>
        {activities.length > 8 && (
          <button className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium">
            View all
          </button>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-100 dark:bg-gray-700" />

        <div className="space-y-1">
          {items.map((activity, index) => {
            const config = TYPE_CONFIG[activity.type] ?? TYPE_CONFIG.lesson;
            return (
              <div
                key={activity.id}
                className="relative flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 group cursor-default"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Icon bubble */}
                <div
                  className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg z-10 transition-transform duration-200 group-hover:scale-110 ${config.color}`}
                >
                  {config.emoji}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-semibold leading-snug">{activity.title}</p>
                  {activity.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {activity.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{timeAgo(activity.created_at)}</span>
                    {activity.xp_earned > 0 && (
                      <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                        +{activity.xp_earned} XP
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activities.length === 0 && (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          No activity yet — complete your first lesson! 🚀
        </p>
      )}
    </section>
  );
}
