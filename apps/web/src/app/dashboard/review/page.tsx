import { redirect } from "next/navigation";
import Link from "next/link";
import { Brain, CalendarClock, ChevronRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDueReviews, getReviewSummary } from "@/lib/reviews";
import { ReviewSession } from "@/components/dashboard/review-session";

export const dynamic = "force-dynamic";

/** One sitting, not the whole backlog — a 200-item queue is a reason to quit. */
const SESSION_SIZE = 20;

export default async function ReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [items, summary] = await Promise.all([getDueReviews(SESSION_SIZE), getReviewSummary()]);

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/dashboard" className="transition-colors hover:text-primary-600">
          Dashboard
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="font-medium text-gray-900 dark:text-gray-100">Review</span>
      </div>

      <div className="mb-8 flex items-center gap-3">
        <div className="gradient-bg-primary flex h-10 w-10 items-center justify-center rounded-xl text-white">
          <Brain className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Spaced <span className="gradient-text">Review</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {items.length > 0
              ? `${items.length} item${items.length === 1 ? "" : "s"} in this session`
              : "Everything you have studied is up to date"}
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <ReviewSession items={items} />
      ) : (
        <EmptyReviewState
          trackedItems={summary.trackedItems}
          dueToday={summary.dueToday}
          masteredItems={summary.masteredItems}
        />
      )}
    </div>
  );
}

function EmptyReviewState({
  trackedItems,
  dueToday,
  masteredItems,
}: {
  trackedItems: number;
  dueToday: number;
  masteredItems: number;
}) {
  /* A learner with nothing tracked has never finished a quiz — they need a
     different nudge from someone who is simply caught up. */
  const neverStudied = trackedItems === 0;

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="rounded-3xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800/60">
        <p className="mb-4 text-6xl">{neverStudied ? "🌱" : "✅"}</p>
        <h2 className="text-xl font-bold">
          {neverStudied ? "Nothing to review yet" : "You are all caught up"}
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {neverStudied
            ? "Finish a vocabulary, writing, or grammar quiz and the words you meet there start appearing here on a spaced schedule."
            : "Every item you have studied is scheduled for later. Come back when the next batch is due."}
        </p>

        {!neverStudied && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/40">
              <p className="text-2xl font-bold">{trackedItems}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Items tracked</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900/40">
              <p className="text-2xl font-bold">{masteredItems}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Well known</p>
            </div>
          </div>
        )}

        {dueToday > 0 && (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
            <CalendarClock className="h-4 w-4" aria-hidden="true" />
            {dueToday} more due later today
          </p>
        )}

        <Link
          href="/dashboard/vocabulary"
          className="gradient-bg-primary mt-6 flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white hover:opacity-90"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {neverStudied ? "Start a quiz" : "Study something new"}
        </Link>
      </div>
    </div>
  );
}
