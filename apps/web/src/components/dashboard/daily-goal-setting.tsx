"use client";

import { useState, useTransition } from "react";
import { Check, Target, TriangleAlert } from "lucide-react";

/* Roughly: a couple of questions, one quest, two quests, a long session. Named
   so the number means something to a learner who has no sense of what XP is. */
const PRESETS = [
  { value: 30, label: "Light", hint: "~1 short quiz" },
  { value: 100, label: "Steady", hint: "~1 daily quest" },
  { value: 200, label: "Focused", hint: "~2 quests" },
  { value: 400, label: "Intense", hint: "a long session" },
];

export function DailyGoalSetting({ currentGoal }: { currentGoal: number }) {
  const [goal, setGoal] = useState(currentGoal);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const choose = (value: number) => {
    if (value === goal || pending) return;

    const previous = goal;
    setGoal(value);
    setSaved(false);
    setError(null);

    startTransition(async () => {
      const { setDailyXpGoal } = await import("@/app/actions/preferences");
      const result = await setDailyXpGoal(value);

      if (result.ok) {
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2500);
      } else {
        /* Roll the selection back so the UI never shows a goal the server
           refused to store. */
        setGoal(previous);
        setError(result.error.message);
      }
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Target className="h-4 w-4 text-primary-500" aria-hidden="true" />
        <h3 className="font-semibold">Daily XP goal</h3>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Saved
          </span>
        )}
      </div>

      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        The target on your dashboard progress bar. Applies from today.
      </p>

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        role="radiogroup"
        aria-label="Daily XP goal"
      >
        {PRESETS.map((preset) => {
          const active = goal === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending}
              onClick={() => choose(preset.value)}
              className={`rounded-xl border p-3 text-center transition-all disabled:opacity-60 ${
                active
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/30"
                  : "border-gray-200 bg-white hover:border-primary-300 dark:border-gray-700 dark:bg-gray-800/60"
              }`}
            >
              <p className="text-lg font-bold tabular-nums">{preset.value}</p>
              <p className="text-xs font-medium">{preset.label}</p>
              <p className="mt-0.5 text-[10px] text-gray-400">{preset.hint}</p>
            </button>
          );
        })}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
