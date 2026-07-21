import { err, ok, type Result } from "@japangolearn/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase.types";

type DailyQuest = Database["public"]["Tables"]["daily_quest_completions"]["Row"];
type MasteryRecord = Database["public"]["Tables"]["mastery_records"]["Row"];

export class ProgressRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listDailyQuests(userId: string, date: string): Promise<Result<DailyQuest[]>> {
    const { data, error } = await this.client
      .from("daily_quest_completions")
      .select("*")
      .eq("user_id", userId)
      .eq("quest_date", date)
      .order("completed_at");

    return error ? err({ code: "DATABASE_ERROR", message: error.message }) : ok(data ?? []);
  }

  async listDueMastery(
    userId: string,
    beforeIso: string,
    limit = 50
  ): Promise<Result<MasteryRecord[]>> {
    const { data, error } = await this.client
      .from("mastery_records")
      .select("*")
      .eq("user_id", userId)
      .lte("next_review_at", beforeIso)
      .order("next_review_at")
      .limit(limit);

    return error ? err({ code: "DATABASE_ERROR", message: error.message }) : ok(data ?? []);
  }
}
