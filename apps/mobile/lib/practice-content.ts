import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyPendingStudyRemovals,
  buildPracticeStudyItems,
  type PendingStudyRemoval,
  type PracticeContentRows,
  type PracticeStudyItem,
} from "@japangolearn/core";
import type { Database } from "@japangolearn/database";
import { readCache, writeCache } from "@/lib/offline-cache";
import { getOfflineQueueEntries } from "@/lib/offline-queue";

export async function loadPracticeStudyItems(
  supabase: SupabaseClient<Database>,
  listId: string
): Promise<PracticeStudyItem[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user.id;
  if (!userId) return [];

  const cacheKey = `practice-study:${userId}:${listId}`;
  const pendingEntries = (await getOfflineQueueEntries(supabase)).filter(
    (entry) => !entry.deadLettered
  );
  const pendingRemovals: PendingStudyRemoval[] = pendingEntries.flatMap((entry) =>
    entry.operation.kind === "practice_list_item_remove"
      ? [{ listId: entry.operation.listId, listItemId: entry.operation.listItemId }]
      : []
  );
  const hasPendingAddition = pendingEntries.some(
    (entry) =>
      entry.operation.kind === "practice_list_item_add" && entry.operation.listId === listId
  );
  const applyPendingProjection = (items: PracticeStudyItem[]) =>
    applyPendingStudyRemovals(items, listId, pendingRemovals);
  const isStillCurrentUser = async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    return currentSession?.user.id === userId;
  };
  const readSavedItems = async () => {
    if (!(await isStillCurrentUser())) return [];
    const cached = await readCache<PracticeStudyItem[]>(cacheKey);
    return applyPendingProjection(cached?.data ?? []);
  };

  const { data: listItems, error: listError } = await supabase
    .from("practice_list_items")
    .select("id, item_type, item_id, mastery_score, last_reviewed")
    .eq("list_id", listId)
    .order("created_at", { ascending: false });

  if (listError) {
    console.error("Failed to load practice list items", listError);
    return readSavedItems();
  }

  if (!(await isStillCurrentUser())) return [];

  if (!listItems?.length) {
    const cached = hasPendingAddition ? await readCache<PracticeStudyItem[]>(cacheKey) : null;
    if (cached?.data.length) {
      const projected = applyPendingProjection(cached.data);
      void writeCache(cacheKey, projected);
      return projected;
    }
    void writeCache(cacheKey, []);
    return [];
  }

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
    return readSavedItems();
  }

  if (!(await isStillCurrentUser())) return [];

  const rows: PracticeContentRows = {
    vocabulary: vocabularyResult.data ?? [],
    kana: kanaResult.data ?? [],
    kanji: kanjiResult.data ?? [],
    grammar: grammarResult.data ?? [],
  };

  const studyItems = buildPracticeStudyItems(listItems, rows);
  const cached = hasPendingAddition ? await readCache<PracticeStudyItem[]>(cacheKey) : null;
  const cachedOnlyItems = cached?.data.filter(
    (cachedItem) =>
      !studyItems.some(
        (studyItem) =>
          studyItem.itemType === cachedItem.itemType && studyItem.itemId === cachedItem.itemId
      )
  );
  const projected = applyPendingProjection([
    ...studyItems,
    ...(hasPendingAddition ? (cachedOnlyItems ?? []) : []),
  ]);
  void writeCache(cacheKey, projected);
  return projected;
}
