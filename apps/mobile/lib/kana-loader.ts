import type { Kana } from "@japangolearn/database";
import { supabase } from "./supabase";
import { readCache, writeCache } from "./offline-cache";
import { captureException } from "./monitoring";
import { prepareKana, type KanaType } from "./kana-catalog";

export type KanaSnapshot = { data: Kana[]; savedAt: number };
export type KanaLoadResult = KanaSnapshot & { error: unknown | null; refreshing: boolean };
const memory = new Map<KanaType, KanaSnapshot>();
const REQUEST_TIMEOUT_MS = 8_000;

export function getRememberedKana(type: KanaType): KanaSnapshot | undefined {
  return memory.get(type);
}

function validRows(value: unknown, type: KanaType): value is Kana[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (row) =>
        row &&
        Number.isInteger(row.id) &&
        row.type === type &&
        typeof row.character === "string" &&
        typeof row.romaji === "string" &&
        typeof row.group_name === "string" &&
        typeof row.sort_order === "number" &&
        typeof row.stroke_count === "number" &&
        row.stroke_count > 0 &&
        typeof row.is_dakuten === "boolean" &&
        typeof row.is_combo === "boolean"
    )
  );
}

/** Paint saved content first; disk reads and the refresh run concurrently. */
export async function loadKana(
  type: KanaType,
  onResult: (result: KanaLoadResult) => void,
  signal: AbortSignal
) {
  let fallback = memory.get(type);
  let networkFinished = false;
  const publish = (result: KanaLoadResult) => {
    if (!signal.aborted) onResult(result);
  };
  if (signal.aborted) return;
  if (fallback) publish({ ...fallback, error: null, refreshing: true });

  const cacheRead = readCache<Kana[]>(`kana-${type}`).then((cached) => {
    if (!cached || !validRows(cached.data, type) || signal.aborted || networkFinished) return;
    if (fallback && fallback.savedAt >= cached.savedAt) return;
    fallback = { data: prepareKana(cached.data, type), savedAt: cached.savedAt };
    memory.set(type, fallback);
    publish({ ...fallback, error: null, refreshing: true });
  });

  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, REQUEST_TIMEOUT_MS);
  try {
    const { data, error } = await supabase
      .from("kana")
      .select(
        "id, character, romaji, romaji_hindi, type, group_name, stroke_count, stroke_hint, sort_order, is_dakuten, is_combo"
      )
      .eq("type", type)
      .order("sort_order")
      .abortSignal(controller.signal);
    if (signal.aborted) return;
    if (error) throw error;
    if (!validRows(data, type)) throw new Error(`No valid ${type} content was returned`);
    networkFinished = true;
    const snapshot = { data: prepareKana(data, type), savedAt: Date.now() };
    memory.set(type, snapshot);
    publish({ ...snapshot, error: null, refreshing: false });
    void writeCache(`kana-${type}`, snapshot.data);
  } catch (error) {
    if (signal.aborted) return;
    await cacheRead;
    networkFinished = true;
    captureException(error, { screen: "writing", kanaType: type });
    publish({
      data: fallback?.data ?? [],
      savedAt: fallback?.savedAt ?? 0,
      error,
      refreshing: false,
    });
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abort);
  }
}
