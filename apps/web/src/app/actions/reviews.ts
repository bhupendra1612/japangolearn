"use server";

import { revalidatePath } from "next/cache";
import { awardQuizXp } from "@/app/actions/gamification";
import type { GradedAnswer } from "@japangolearn/core";

/**
 * Submits a completed review session.
 *
 * Reviews go through the same `award_xp` path as quizzes, so they reschedule
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
  const result = await awardQuizXp({
    activityType: "review_session",
    correctAnswers: answers.filter((answer) => answer.isCorrect).length,
    totalQuestions: answers.length,
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
