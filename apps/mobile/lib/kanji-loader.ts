import type { Kanji } from "@japangolearn/database";
import { CONTENT_JLPT_LEVEL } from "@japangolearn/content";
import { supabase } from "./supabase";
import { readCache, writeCache } from "./offline-cache";
import { captureException } from "./monitoring";
import { isOfflineError } from "./connectivity";
import { prepareKanji } from "./kanji-study";

export type KanjiLoad = { data: Kanji[]; savedAt: number; refreshing: boolean; error: boolean };
let memory: KanjiLoad | undefined;
export const rememberedKanji = () => memory;
const key = `kanji-library-v1:${CONTENT_JLPT_LEVEL}`;

export async function loadKanji(publish: (value: KanjiLoad) => void, signal: AbortSignal) {
  if (signal.aborted) return;
  let fallback = memory;
  let finished = false;
  const emit = (value: KanjiLoad) => {
    if (!signal.aborted) publish(value);
  };
  emit({
    data: fallback?.data ?? [],
    savedAt: fallback?.savedAt ?? 0,
    refreshing: true,
    error: false,
  });
  const disk = readCache<Kanji[]>(key).then((cached) => {
    if (!cached || finished || signal.aborted || (fallback && fallback.savedAt >= cached.savedAt))
      return;
    const data = prepareKanji(cached.data);
    if (!data.length) return;
    fallback = { data, savedAt: cached.savedAt, refreshing: true, error: false };
    emit(fallback);
  });
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 12_000);
  try {
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase
        .from("kanji")
        .select("*")
        .eq("jlpt_level", CONTENT_JLPT_LEVEL)
        .order("order_index")
        .order("id")
        .range(offset, offset + 499)
        .abortSignal(controller.signal);
      if (signal.aborted) return;
      if (error) throw error;
      if (!data) throw new Error("No kanji data returned");
      rows.push(...data);
      if (data.length < 500) break;
    }
    const data = prepareKanji(rows);
    if (!data.length || data.length !== rows.length) throw new Error("Kanji content is incomplete");
    finished = true;
    memory = { data, savedAt: Date.now(), refreshing: false, error: false };
    emit(memory);
    void writeCache(key, data);
  } catch (error) {
    if (signal.aborted) return;
    await disk;
    finished = true;
    if (!isOfflineError(error)) captureException(error, { screen: "kanji" });
    emit({
      data: fallback?.data ?? [],
      savedAt: fallback?.savedAt ?? 0,
      refreshing: false,
      error: true,
    });
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  }
}
