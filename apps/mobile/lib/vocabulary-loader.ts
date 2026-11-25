import type { VocabularyWord } from "@japangolearn/database";
import { supabase } from "./supabase";
import { readCache, writeCache } from "./offline-cache";
import { captureException } from "./monitoring";
import { CONTENT_JLPT_LEVEL } from "@/constants/jlpt";

type Snapshot = { data: VocabularyWord[]; savedAt: number };
export type VocabularyLoad = Snapshot & { refreshing: boolean; error: unknown | null };
let memory: Snapshot | undefined;
export const rememberedVocabulary = () => memory;
const key = "vocabulary-n5";
function valid(value: unknown): value is VocabularyWord[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (row) =>
        row &&
        Number.isInteger(row.id) &&
        typeof row.hiragana === "string" &&
        typeof row.english === "string" &&
        typeof row.romaji === "string" &&
        typeof row.topic === "string"
    )
  );
}

/** Cache first; publish a complete paginated refresh only, never a truncated page. */
export async function loadVocabulary(
  onResult: (value: VocabularyLoad) => void,
  signal: AbortSignal
) {
  let fallback = memory;
  let finished = false;
  const publish = (result: VocabularyLoad) => {
    if (!signal.aborted) onResult(result);
  };
  if (signal.aborted) return;
  if (fallback) publish({ ...fallback, refreshing: true, error: null });
  else publish({ data: [], savedAt: 0, refreshing: true, error: null });
  const cached = readCache<VocabularyWord[]>(key).then((saved) => {
    if (
      !saved ||
      !valid(saved.data) ||
      finished ||
      signal.aborted ||
      (fallback && fallback.savedAt >= saved.savedAt)
    )
      return;
    fallback = saved;
    memory = saved;
    publish({ ...saved, refreshing: true, error: null });
  });
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 12_000);
  try {
    const rows: VocabularyWord[] = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from("vocabulary")
        .select("id, kanji, hiragana, romaji, romaji_hindi, english, topic, jlpt_level, icon")
        .eq("jlpt_level", CONTENT_JLPT_LEVEL)
        .order("id")
        .range(offset, offset + pageSize - 1)
        .abortSignal(controller.signal);
      if (signal.aborted) return;
      if (error) throw error;
      if (!data || (data.length > 0 && !valid(data))) throw new Error("Invalid vocabulary data");
      rows.push(...data);
      if (data.length < pageSize) break;
    }
    if (!valid(rows)) throw new Error("No vocabulary returned");
    finished = true;
    memory = { data: rows, savedAt: Date.now() };
    publish({ ...memory, refreshing: false, error: null });
    void writeCache(key, rows);
  } catch (error) {
    if (signal.aborted) return;
    await cached;
    finished = true;
    captureException(error, { screen: "vocabulary" });
    publish({
      data: fallback?.data ?? [],
      savedAt: fallback?.savedAt ?? 0,
      refreshing: false,
      error,
    });
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  }
}
