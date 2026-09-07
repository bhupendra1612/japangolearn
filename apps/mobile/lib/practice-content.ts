import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildPracticeStudyItems,
  type PracticeContentRows,
  type PracticeStudyItem,
} from "@japangolearn/core";
import type { Database } from "@japangolearn/database";

export async function loadPracticeStudyItems(
  supabase: SupabaseClient<Database>,
  listId: string
): Promise<PracticeStudyItem[]> {
  const { data: listItems, error: listError } = await supabase
    .from("practice_list_items")
    .select("id, item_type, item_id, mastery_score, last_reviewed")
    .eq("list_id", listId)
    .order("created_at", { ascending: false });

  if (listError) {
    console.error("Failed to load practice list items", listError);
    return [];
  }

  if (!listItems?.length) return [];

  const vocabularyIds = listItems
    .filter((item) => item.item_type === "vocabulary")
    .map((item) => item.item_id);
  const kanaIds = listItems.filter((item) => item.item_type === "kana").map((item) => item.item_id);
  const kanjiIds = listItems
    .filter((item) => item.item_type === "kanji")
    .map((item) => item.item_id);
  const grammarIds = listItems
    .filter((item) => item.item_type === "grammar")
    .map((item) => item.item_id);

  const [vocabularyResult, kanaResult, kanjiResult, grammarResult] = await Promise.all([
    vocabularyIds.length
      ? supabase.from("vocabulary").select("id, kanji, hiragana, english").in("id", vocabularyIds)
      : Promise.resolve({ data: [], error: null }),
    kanaIds.length
      ? supabase.from("kana").select("id, character, romaji").in("id", kanaIds)
      : Promise.resolve({ data: [], error: null }),
    kanjiIds.length
      ? supabase.from("kanji").select("id, character, hiragana, meaning_en").in("id", kanjiIds)
      : Promise.resolve({ data: [], error: null }),
    grammarIds.length
      ? supabase.from("grammar_patterns").select("id, title, pattern, meaning").in("id", grammarIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const contentErrors = [
    vocabularyResult.error,
    kanaResult.error,
    kanjiResult.error,
    grammarResult.error,
  ].filter(Boolean);
  if (contentErrors.length > 0) {
    console.error("Failed to hydrate practice list content", contentErrors[0]);
    return [];
  }

  const rows: PracticeContentRows = {
    vocabulary: vocabularyResult.data ?? [],
    kana: kanaResult.data ?? [],
    kanji: kanjiResult.data ?? [],
    grammar: grammarResult.data ?? [],
  };

  return buildPracticeStudyItems(listItems, rows);
}
