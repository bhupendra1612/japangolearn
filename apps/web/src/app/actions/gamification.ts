"use server";

import { createClient } from "@/lib/supabase/server";
import { err, errorFromUnknown, ok, type QuizActivityType, type Result } from "@japangolearn/core";
import type { Database } from "@japangolearn/database";

type XpAward = Database["public"]["Functions"]["award_xp"]["Returns"][number];

async function requestXpAward({
  activityType,
  correctAnswers,
  totalQuestions,
  attemptKey,
}: {
  activityType: string;
  correctAnswers: number;
  totalQuestions: number;
  attemptKey: string;
}): Promise<Result<XpAward>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return err({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }

  const { data, error } = await supabase.rpc("award_xp", {
    p_activity_type: activityType,
    p_correct_answers: correctAnswers,
    p_total_questions: totalQuestions,
    p_attempt_key: attemptKey,
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
  correctAnswers,
  totalQuestions,
  attemptKey,
}: {
  activityType: QuizActivityType;
  correctAnswers: number;
  totalQuestions: number;
  attemptKey: string;
}) {
  try {
    return await requestXpAward({
      activityType,
      correctAnswers,
      totalQuestions,
      attemptKey,
    });
  } catch (error: unknown) {
    console.error("Error awarding quiz XP:", error);
    return err(errorFromUnknown(error));
  }
}
