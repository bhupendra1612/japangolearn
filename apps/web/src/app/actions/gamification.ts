"use server";

import { createClient } from "@/lib/supabase/server";

type QuizActivityType = "vocabulary_quiz" | "grammar_quiz" | "writing_quiz" | "practice_quiz";

type DailyTaskId = "vocabulary" | "kanji" | "grammar" | "listening";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error";
}

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
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const { data, error } = await supabase.rpc("award_xp", {
    p_activity_type: activityType,
    p_correct_answers: correctAnswers,
    p_total_questions: totalQuestions,
    p_attempt_key: attemptKey,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, award: data?.[0] ?? null };
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
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function completeDailyTask(taskId: DailyTaskId) {
  try {
    return await requestXpAward({
      activityType: `daily_${taskId}`,
      correctAnswers: 0,
      totalQuestions: 0,
      attemptKey: "daily-task",
    });
  } catch (error: unknown) {
    console.error("Error completing daily task:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
