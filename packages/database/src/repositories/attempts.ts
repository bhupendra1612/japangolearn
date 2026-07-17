import { err, ok, type Result } from "@japangolearn/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase.types";

export type LearningAttempt = Database["public"]["Tables"]["learning_attempts"]["Row"];

export class AttemptsRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listRecent(userId: string, limit = 50): Promise<Result<LearningAttempt[]>> {
    const { data, error } = await this.client
      .from("learning_attempts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(limit);

    return error ? err({ code: "DATABASE_ERROR", message: error.message }) : ok(data ?? []);
  }

  async getAccuracySummary(
    userId: string,
    sinceIso: string
  ): Promise<
    Result<{
      attempts: number;
      correctAnswers: number;
      totalQuestions: number;
      accuracyPercent: number;
      durationSeconds: number;
    }>
  > {
    const { data, error } = await this.client
      .from("learning_attempts")
      .select("correct_answers,total_questions,duration_seconds")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("completed_at", sinceIso);

    if (error) return err({ code: "DATABASE_ERROR", message: error.message });

    const summary = (data ?? []).reduce(
      (total, attempt) => ({
        attempts: total.attempts + 1,
        correctAnswers: total.correctAnswers + attempt.correct_answers,
        totalQuestions: total.totalQuestions + attempt.total_questions,
        durationSeconds: total.durationSeconds + (attempt.duration_seconds ?? 0),
      }),
      { attempts: 0, correctAnswers: 0, totalQuestions: 0, durationSeconds: 0 }
    );

    return ok({
      ...summary,
      accuracyPercent:
        summary.totalQuestions > 0
          ? Math.round((summary.correctAnswers / summary.totalQuestions) * 10_000) / 100
          : 0,
    });
  }
}
