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

type XpAward = Database["public"]["Functions"]["award_xp"]["Returns"][number];

async function requestXpAward({
  activityType,
  attemptKey,
  answers,
}: {
  activityType: QuizActivityType;
  attemptKey: string;
  answers: GradedAnswer[];
}): Promise<Result<XpAward>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return err({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }

  const payload = toGradedAnswerPayload(answers);

  const { data, error } = await supabase.rpc("award_xp", {
    p_activity_type: activityType,
    p_attempt_key: attemptKey,
    p_answers: payload as unknown as Json,
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

export async function awardQuizXp({
  activityType,
  attemptKey,
  answers,
}: {
  activityType: QuizActivityType;
  attemptKey: string;
  /** Per-item answers are validated and graded by the database. */
  answers: GradedAnswer[];
}) {
  try {
    return await requestXpAward({
      activityType,
      attemptKey,
      answers,
    });
  } catch (error: unknown) {
    console.error("Error awarding quiz XP:", error);
    return err(errorFromUnknown(error));
  }
}
