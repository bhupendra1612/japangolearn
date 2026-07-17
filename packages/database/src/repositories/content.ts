import { err, ok, type Result } from "@japangolearn/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase.types";

type VocabularyRow = Database["public"]["Tables"]["vocabulary"]["Row"];
type GrammarRow = Database["public"]["Tables"]["grammar_patterns"]["Row"];
type KanaRow = Database["public"]["Tables"]["kana"]["Row"];
type KanjiRow = Database["public"]["Tables"]["kanji"]["Row"];

export class ContentRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listVocabulary(level = "N5"): Promise<Result<VocabularyRow[]>> {
    const { data, error } = await this.client
      .from("vocabulary")
      .select("*")
      .eq("jlpt_level", level)
      .order("topic")
      .order("id");
    return error ? err({ code: "DATABASE_ERROR", message: error.message }) : ok(data ?? []);
  }

  async listGrammar(level = "N5"): Promise<Result<GrammarRow[]>> {
    const { data, error } = await this.client
      .from("grammar_patterns")
      .select("*")
      .eq("jlpt_level", level)
      .order("order_index");
    return error ? err({ code: "DATABASE_ERROR", message: error.message }) : ok(data ?? []);
  }

  async listKana(): Promise<Result<KanaRow[]>> {
    const { data, error } = await this.client.from("kana").select("*").order("sort_order");
    return error ? err({ code: "DATABASE_ERROR", message: error.message }) : ok(data ?? []);
  }

  async listKanji(level = "N5"): Promise<Result<KanjiRow[]>> {
    const { data, error } = await this.client
      .from("kanji")
      .select("*")
      .eq("jlpt_level", level)
      .order("order_index");
    return error ? err({ code: "DATABASE_ERROR", message: error.message }) : ok(data ?? []);
  }
}
