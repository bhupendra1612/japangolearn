import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@japangolearn/database";
import { readCache, writeCache } from "@/lib/offline-cache";
import {
  getListeningPracticeItemId,
  getListeningQuestionByPracticeItemId,
  type ExamQuestion,
} from "@/lib/exam-content";

export type ListeningPracticeItem = {
  listItemId: string;
  itemId: number;
  questionId: string;
  prompt: string;
  skill: string;
  explanation: string;
  createdAt: string;
};

type SaveResult = { ok: true; addedCount: number } | { ok: false; message: string };

function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Could not update the practice list.";
}

export async function loadListeningPracticeItems(
  client: SupabaseClient<Database>,
  listId: string
): Promise<ListeningPracticeItem[]> {
  const {
    data: { session },
  } = await client.auth.getSession();
  const userId = session?.user.id;
  if (!userId) return [];

  const cacheKey = `listening-practice:${userId}:${listId}`;
  const { data, error } = await client
    .from("practice_list_items")
    .select("id, item_id, created_at")
    .eq("list_id", listId)
    .eq("item_type", "listening")
    .order("created_at", { ascending: false });

  if (error) {
    return (await readCache<ListeningPracticeItem[]>(cacheKey))?.data ?? [];
  }

  const items = (data ?? []).flatMap((row) => {
    const question = getListeningQuestionByPracticeItemId(row.item_id);
    if (!question?.audioScript) return [];
    return [
      {
        listItemId: row.id,
        itemId: row.item_id,
        questionId: question.id,
        prompt: question.prompt,
        skill: question.skill,
        explanation: question.explanation,
        createdAt: row.created_at,
      },
    ];
  });
  void writeCache(cacheKey, items);
  return items;
}

export async function addListeningMistakesToList(
  client: SupabaseClient<Database>,
  listId: string,
  questions: readonly ExamQuestion[]
): Promise<SaveResult> {
  const rows = questions.flatMap((question) => {
    const itemId = getListeningPracticeItemId(question.id);
    return itemId === undefined
      ? []
      : [{ list_id: listId, item_type: "listening", item_id: itemId }];
  });
  if (rows.length === 0) return { ok: false, message: "No listening mistakes were selected." };

  const { error } = await client.from("practice_list_items").upsert(rows, {
    onConflict: "list_id,item_type,item_id",
    ignoreDuplicates: true,
  });
  if (error) return { ok: false, message: errorMessage(error) };
  return { ok: true, addedCount: rows.length };
}

export async function removeListeningPracticeItem(
  client: SupabaseClient<Database>,
  listItemId: string
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await client
    .from("practice_list_items")
    .delete()
    .eq("id", listItemId)
    .eq("item_type", "listening");
  return error ? { ok: false, message: errorMessage(error) } : { ok: true };
}
