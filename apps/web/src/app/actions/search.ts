"use server";

import { createClient } from "@/lib/supabase/server";
import { err, errorFromUnknown, ok } from "@japangolearn/core";
import type { MasteryItemType } from "@japangolearn/core";

export type SearchHit = {
  itemType: MasteryItemType;
  itemId: number;
  title: string;
  subtitle: string | null;
  meaning: string | null;
  jlptLevel: string | null;
};

const ITEM_TYPES: MasteryItemType[] = ["vocabulary", "kana", "kanji", "grammar"];

/**
 * Searches vocabulary, kanji, kana, and grammar in one pass.
 *
 * Ranking happens in the database so an exact hit (searching "ka" and meaning
 * the kana か) outranks the many substring matches it also appears in.
 */
export async function searchCurriculum(query: string) {
  const clean = query.trim();
  if (clean.length === 0) return ok([] as SearchHit[]);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_curriculum", {
      p_query: clean,
      p_limit: 30,
    });

    if (error) {
      return err({
        code: error.code === "42501" ? "UNAUTHORIZED" : "DATABASE_ERROR",
        message: error.message,
      });
    }

    const hits: SearchHit[] = (data ?? []).flatMap((row) => {
      if (!(ITEM_TYPES as string[]).includes(row.item_type)) return [];
      return [
        {
          itemType: row.item_type as MasteryItemType,
          itemId: row.item_id,
          title: row.title,
          subtitle: row.subtitle,
          meaning: row.meaning,
          jlptLevel: row.jlpt_level,
        },
      ];
    });

    return ok(hits);
  } catch (error: unknown) {
    console.error("Error searching curriculum:", error);
    return err(errorFromUnknown(error, "DATABASE_ERROR"));
  }
}
