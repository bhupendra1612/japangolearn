"use server";

import { revalidatePath } from "next/cache";
import { submitLearningAttempt } from "@/app/actions/gamification";
import type { GradedAnswer } from "@japangolearn/core";

/**
 * Submits a completed review session.
 *
 * Reviews go through the same `submit_learning_attempt` path as quizzes, so they reschedule
 * mastery, extend the streak, count toward the daily goal, and recompute level
 * progress exactly like fresh practice — at a lower XP rate, and without
 * completing a daily quest.
 */
export async function submitReviewSession({
  answers,
  attemptKey,
}: {
  answers: GradedAnswer[];
  attemptKey: string;
}) {
  const result = await submitLearningAttempt({
    activityType: "review_session",
    attemptKey,
    answers,
  });

  if (result.ok) {
    /* The dashboard's due count and the levels page both derive from what this
       call just changed, so their cached renders are now stale. */
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/review");
    revalidatePath("/dashboard/levels");
  }

  return result;
}
