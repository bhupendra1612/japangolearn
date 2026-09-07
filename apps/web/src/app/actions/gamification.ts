"use server";

import { createClient } from "@/lib/supabase/server";
import {
  err,
  errorFromUnknown,
  ok,
  toGradedAnswerPayload,
  type GradedAnswer,
  type QuizActivityType,
  type Result,
} from "@japangolearn/core";
import type { Database, Json } from "@japangolearn/database";

type LearningAttempt =
  Database["public"]["Functions"]["submit_learning_attempt"]["Returns"][number];

async function requestLearningAttempt({
  activityType,
  attemptKey,
  answers,
  practiceListId,
}: {
  activityType: QuizActivityType;
  attemptKey: string;
  answers: GradedAnswer[];
  practiceListId?: string | null;
}): Promise<Result<LearningAttempt>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return err({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }

  const payload = toGradedAnswerPayload(answers);

  const { data, error } = await supabase.rpc("submit_learning_attempt", {
    p_activity_type: activityType,
    p_attempt_key: attemptKey,
    p_answers: payload as unknown as Json,
    ...(practiceListId ? { p_practice_list_id: practiceListId } : {}),
  });

  if (error) {
    return err({
      code: error.code === "42501" ? "UNAUTHORIZED" : "DATABASE_ERROR",
      message: error.message,
    });
  }

  const award = data?.[0];
  if (!award) {
    return err({
      code: "DATABASE_ERROR",
      message: "The XP award did not return a result.",
    });
  }

  return ok(award);
}

export async function submitLearningAttempt({
  activityType,
  attemptKey,
  answers,
  practiceListId,
}: {
  activityType: QuizActivityType;
  attemptKey: string;
  /** Per-item answers are validated and graded by the database. */
  answers: GradedAnswer[];
  practiceListId?: string | null;
}) {
  try {
    return await requestLearningAttempt({
      activityType,
      attemptKey,
      answers,
      practiceListId,
    });
  } catch (error: unknown) {
    console.error("Error submitting learning attempt:", error);
    return err(errorFromUnknown(error));
  }
}
