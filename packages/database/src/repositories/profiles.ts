import type { Result } from "@japangolearn/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase.types";
import { fromPostgrest } from "./shared";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfilePatch = Pick<
  ProfileRow,
  "display_name" | "avatar_url" | "current_jlpt_level" | "onboarding_completed"
>;

export class ProfilesRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getById(userId: string): Promise<Result<ProfileRow>> {
    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    return fromPostgrest(data, error, "Profile not found.");
  }

  async updateOwn(userId: string, patch: Partial<ProfilePatch>): Promise<Result<ProfileRow>> {
    const { data, error } = await this.client
      .from("profiles")
      .update(patch)
      .eq("id", userId)
      .select("*")
      .single();

    return fromPostgrest(data, error);
  }
}
