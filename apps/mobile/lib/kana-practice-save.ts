import { toGradedAnswerPayload, type OfflineJson, type GradedAnswer } from "@japangolearn/core";
import { supabase } from "./supabase";
import { submitLearningAttemptWithQueue } from "./offline-queue";
import type { PracticeAnswer } from "./kana-practice";

export type PracticeSaveResult =
  | { status: "guest" | "review" | "saving" | "queued" }
  | { status: "submitted"; xp: number | null }
  | { status: "failed"; message: string };

export async function saveKanaPractice(
  attemptKey: string,
  userId: string | undefined,
  answers: PracticeAnswer[],
  reviewOnly = false
): Promise<PracticeSaveResult> {
  return saveLearningQuiz("writing_quiz", attemptKey, userId, answers, reviewOnly);
}

export async function saveLearningQuiz(
  activityType: "writing_quiz" | "vocabulary_quiz",
  attemptKey: string,
  userId: string | undefined,
  answers: GradedAnswer[],
  reviewOnly = false
): Promise<PracticeSaveResult> {
  if (reviewOnly) return { status: "review" };
  if (!userId) return { status: "guest" };
  try {
    const result = await submitLearningAttemptWithQueue(supabase, {
      activityType,
      attemptKey,
      expectedUserId: userId,
      answers: toGradedAnswerPayload(answers) as unknown as OfflineJson,
    });
    if (result.status === "queued") return result;
    if (result.status === "failed")
      return {
        status: "failed",
        message: "Your score is shown here, but progress could not be saved. Try syncing again.",
      };
    // Read the authoritative receipt. Never present estimated XP as awarded XP.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const { data, error } = await supabase
        .from("xp_ledger")
        .select("amount")
        .eq("user_id", userId)
        .eq("award_key", `quiz:${attemptKey}`)
        .abortSignal(controller.signal)
        .maybeSingle();
      return {
        status: "submitted",
        xp: !error && typeof data?.amount === "number" ? data.amount : null,
      };
    } catch {
      return { status: "submitted", xp: null };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return {
      status: "failed",
      message: "Progress could not be saved. Your results are still available here.",
    };
  }
}
