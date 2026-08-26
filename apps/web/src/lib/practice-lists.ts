/* Server-only by construction: createClient reaches for next/headers. */
import { createClient } from "@/lib/supabase/server";
import type { MasteryItemType } from "@japangolearn/core";

export type SavedListSummary = {
  id: string;
  title: string;
  isSmartList: boolean;
  itemCount: number;
  updatedAt: string;
};

export type SavedListItem = {
  id: string;
  itemType: MasteryItemType;
  itemId: number;
  title: string;
  subtitle: string | null;
  meaning: string | null;
};

const ITEM_TYPES: MasteryItemType[] = ["vocabulary", "kana", "kanji", "grammar"];

function isItemType(value: string): value is MasteryItemType {
  return (ITEM_TYPES as string[]).includes(value);
}

/**
 * The learner's saved lists.
 *
 * These tables have existed since the original schema and are fully implemented
 * in the mobile app, but the web app never read them — so a list saved on a
 * phone was invisible on a laptop. Same tables, same RLS, no new schema.
 */
export async function getSavedLists(): Promise<SavedListSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("practice_lists")
    .select("id, title, is_smart_list, updated_at, practice_list_items(count)")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to load saved lists", error);
    return [];
  }

  return (data ?? []).map((row) => {
    /* PostgREST returns an aggregate embed as an array with one {count} row. */
    const embed = row.practice_list_items as unknown as { count: number }[] | null;
    return {
      id: row.id,
      title: row.title,
      isSmartList: row.is_smart_list,
      itemCount: embed?.[0]?.count ?? 0,
      updatedAt: row.updated_at,
    };
  });
}

/**
 * Items in one list, joined to their content.
 *
 * `practice_list_items.item_id` is an integer pointing into four different
 * content tables, so the join has to be done here rather than in one query.
 */
export async function getSavedListItems(listId: string): Promise<{
  title: string;
  items: SavedListItem[];
} | null> {
  const supabase = await createClient();

  const { data: list, error: listError } = await supabase
    .from("practice_lists")
    .select("id, title")
    .eq("id", listId)
    .maybeSingle();

  if (listError || !list) return null;

  const { data: rows, error } = await supabase
    .from("practice_list_items")
    .select("id, item_type, item_id")
    .eq("list_id", listId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load saved list items", error);
    return { title: list.title, items: [] };
  }

  const byType = new Map<MasteryItemType, number[]>();
  for (const row of rows ?? []) {
    if (!isItemType(row.item_type)) continue;
    byType.set(row.item_type, [...(byType.get(row.item_type) ?? []), row.item_id]);
  }

  const [vocabulary, kanji, kana, grammar] = await Promise.all([
    byType.has("vocabulary")
      ? supabase
          .from("vocabulary")
          .select("id, kanji, hiragana, english")
          .in("id", byType.get("vocabulary") ?? [])
      : Promise.resolve({ data: [] }),
    byType.has("kanji")
      ? supabase
          .from("kanji")
          .select("id, character, hiragana, meaning_en")
          .in("id", byType.get("kanji") ?? [])
      : Promise.resolve({ data: [] }),
    byType.has("kana")
      ? supabase
          .from("kana")
          .select("id, character, type, romaji")
          .in("id", byType.get("kana") ?? [])
      : Promise.resolve({ data: [] }),
    byType.has("grammar")
      ? supabase
          .from("grammar_patterns")
          .select("id, title, pattern, meaning")
          .in("id", byType.get("grammar") ?? [])
      : Promise.resolve({ data: [] }),
  ]);

  const lookup = new Map<string, { title: string; subtitle: string | null; meaning: string }>();
  for (const row of vocabulary.data ?? []) {
    lookup.set(`vocabulary:${row.id}`, {
      title: row.kanji || row.hiragana,
      subtitle: row.hiragana,
      meaning: row.english,
    });
  }
  for (const row of kanji.data ?? []) {
    lookup.set(`kanji:${row.id}`, {
      title: row.character,
      subtitle: row.hiragana,
      meaning: (row.meaning_en ?? []).join(", "),
    });
  }
  for (const row of kana.data ?? []) {
    lookup.set(`kana:${row.id}`, {
      title: row.character,
      subtitle: row.type,
      meaning: row.romaji,
    });
  }
  for (const row of grammar.data ?? []) {
    lookup.set(`grammar:${row.id}`, {
      title: row.title,
      subtitle: row.pattern,
      meaning: row.meaning,
    });
  }

  const items = (rows ?? []).flatMap((row) => {
    if (!isItemType(row.item_type)) return [];
    const content = lookup.get(`${row.item_type}:${row.item_id}`);
    /* An item whose content row has since been deleted is dropped rather than
       rendered as a blank card. */
    if (!content) return [];

    return [
      {
        id: row.id,
        itemType: row.item_type,
        itemId: row.item_id,
        title: content.title,
        subtitle: content.subtitle,
        meaning: content.meaning,
      },
    ];
  });

  return { title: list.title, items };
}
