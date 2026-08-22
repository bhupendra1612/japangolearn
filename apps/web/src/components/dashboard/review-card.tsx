import Link from "next/link";
import { Brain, CheckCircle2, ChevronRight, Sprout, TriangleAlert } from "lucide-react";
import type { ReviewSummary } from "@/lib/reviews";

/**
 * The dashboard's spaced-repetition card.
 *
 * Three states, because they call for three different things from the learner:
 * items are due (act now), nothing is due (reassure), or nothing is tracked yet
 * (explain what this is). Showing "0 due" to someone who has never studied
 * reads like a broken feature rather than an empty queue.
 */
export function ReviewCard({ summary }: { summary: ReviewSummary }) {
  if (summary.trackedItems === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-gray-300 bg-white/60 p-5 dark:border-gray-700 dark:bg-gray-800/40">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
            <Sprout className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold">Reviews start after your first quiz</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Every word, kana, and grammar point you answer gets its own schedule, and comes back
              right before you would forget it.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (summary.dueNow === 0) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold">No reviews due</h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {summary.trackedItems} item{summary.trackedItems === 1 ? "" : "s"} tracked ·{" "}
                {summary.masteredItems} well known
                {summary.dueToday > 0 && ` · ${summary.dueToday} due later today`}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/review"
            className="shrink-0 rounded-xl bg-gray-100 px-4 py-2.5 text-center text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            View schedule
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-5 sm:p-6 dark:border-primary-800 dark:from-primary-900/30 dark:to-gray-800/60">
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary-500/10 blur-2xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="gradient-bg-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white">
            <Brain className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-3xl font-black tabular-nums">{summary.dueNow}</span>
              <h2 className="text-lg font-bold">
                item{summary.dueNow === 1 ? "" : "s"} due for review
              </h2>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Recall these now and they stay in memory longer.
            </p>
            {summary.weakItems > 0 && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
                <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                {summary.weakItems} item{summary.weakItems === 1 ? "" : "s"} you keep missing
              </p>
            )}
          </div>
        </div>

        <Link
          href="/dashboard/review"
          className="gradient-bg-primary flex shrink-0 items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-white transition-all hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg"
        >
          Start review
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
