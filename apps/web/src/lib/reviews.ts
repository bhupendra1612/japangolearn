/* Server-only by construction: createClient reaches for next/headers, which
   throws if this module is ever pulled into a client bundle. */
import { createClient } from "@/lib/supabase/server";
import type { MasteryItemType } from "@japangolearn/core";

export type ReviewSummary = {
  dueNow: number;
  dueToday: number;
  trackedItems: number;
  weakItems: number;
  masteredItems: number;
};

export type ReviewItem = {
  itemType: MasteryItemType;
  itemId: string;
  masteryScore: number;
  prompt: string;
  reading: string | null;
  answer: string;
};

export const EMPTY_REVIEW_SUMMARY: ReviewSummary = {
  dueNow: 0,
  dueToday: 0,
  trackedItems: 0,
  weakItems: 0,
  masteredItems: 0,
};

const ITEM_TYPES: MasteryItemType[] = ["vocabulary", "kana", "kanji", "grammar"];

function isItemType(value: string): value is MasteryItemType {
  return (ITEM_TYPES as string[]).includes(value);
}

/**
 * Counts behind the dashboard's review card.
 *
 * Returns the empty summary rather than throwing when the query fails: a
 * degraded card is better than a dashboard that will not render, and the
 * caller has no useful recovery beyond hiding the card.
 */
export async function getReviewSummary(): Promise<ReviewSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_review_summary");

  if (error) {
    console.error("Failed to load review summary", error);
    return EMPTY_REVIEW_SUMMARY;
  }

  const row = data?.[0];
  if (!row) return EMPTY_REVIEW_SUMMARY;

  return {
    dueNow: row.due_now ?? 0,
    dueToday: row.due_today ?? 0,
    trackedItems: row.tracked_items ?? 0,
    weakItems: row.weak_items ?? 0,
    masteredItems: row.mastered_items ?? 0,
  };
}

/**
 * The due queue, already joined to its content by the database.
 *
 * Rows whose content row has since been deleted come back with a null prompt or
 * answer and are dropped here — a card with nothing on it is worse than a
 * shorter session.
 */
export async function getDueReviews(limit = 20): Promise<ReviewItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_due_reviews", { p_limit: limit });

  if (error) {
    console.error("Failed to load review queue", error);
    return [];
  }

  return (data ?? []).flatMap((row) => {
    if (!row.prompt || !row.answer || !isItemType(row.item_type)) return [];

    return [
      {
        itemType: row.item_type,
        itemId: row.item_id,
        masteryScore: Number(row.mastery_score) || 0,
        prompt: row.prompt,
        reading: row.reading,
        answer: row.answer,
      },
    ];
  });
}
