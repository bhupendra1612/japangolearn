/* Server-only by construction: createClient reaches for next/headers, which
   throws if this module is ever pulled into a client bundle. */
import { createClient } from "@/lib/supabase/server";
import type { MasteryItemType } from "@japangolearn/core";

export type SkillBreakdown = {
  itemType: MasteryItemType;
  tracked: number;
  mastered: number;
  avgMastery: number;
  accuracy: number;
};

export type DailyKanji = {
  id: number;
  glyph: string;
  meaning: string;
  reading: string | null;
  romaji: string | null;
  jlptLevel: string;
  strokeCount: number;
};

export type ResumePoint = {
  activityType: string;
  label: string;
  href: string;
  lastAt: string;
  correct: number;
  total: number;
};

/** Where each activity type sends the learner back to. */
const RESUME_TARGETS: Record<string, { label: string; href: string }> = {
  vocabulary_quiz: { label: "Vocabulary", href: "/dashboard/vocabulary" },
  grammar_quiz: { label: "Grammar", href: "/dashboard/grammar" },
  writing_quiz: { label: "Writing", href: "/dashboard/writing" },
  review_session: { label: "Review", href: "/dashboard/review" },
  practice_quiz: { label: "Practice", href: "/dashboard/saved" },
};

/**
 * The last thing the learner finished.
 *
 * "Continue Learning" used to be a fixed link to the levels page regardless of
 * what anyone had been doing; this makes it point back at the real activity.
 */
export async function getResumePoint(): Promise<ResumePoint | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_resume_point");

  if (error) {
    console.error("Failed to load resume point", error);
    return null;
  }

  const row = data?.[0];
  const target = row ? RESUME_TARGETS[row.activity_type] : undefined;
  if (!row || !target) return null;

  return {
    activityType: row.activity_type,
    label: target.label,
    href: target.href,
    lastAt: row.last_at,
    correct: row.correct_answers ?? 0,
    total: row.total_questions ?? 0,
  };
}

export type NotificationKind = "review" | "streak" | "achievement" | "xp";

export type DashboardNotification = {
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  occurredAt: string | null;
  unread: boolean;
};

const ITEM_TYPES: MasteryItemType[] = ["vocabulary", "kana", "kanji", "grammar"];
const NOTIFICATION_KINDS: NotificationKind[] = ["review", "streak", "achievement", "xp"];

/**
 * Reads the first entry of a kanji reading column.
 *
 * `onyomi` and `kunyomi` are jsonb and have been stored both as bare arrays and
 * as arrays of objects over the life of the table, so this tolerates either
 * rather than assuming one shape.
 */
function firstReading(value: unknown): string | null {
  if (typeof value === "string") return value || null;
  if (!Array.isArray(value) || value.length === 0) return null;

  const first = value[0];
  if (typeof first === "string") return first || null;
  if (first && typeof first === "object") {
    const record = first as Record<string, unknown>;
    for (const key of ["reading", "kana", "value", "text"]) {
      if (typeof record[key] === "string" && record[key]) return record[key] as string;
    }
  }
  return null;
}

export async function getSkillBreakdown(): Promise<SkillBreakdown[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_skill_breakdown");

  if (error) {
    console.error("Failed to load skill breakdown", error);
    return [];
  }

  return (data ?? []).flatMap((row) => {
    if (!(ITEM_TYPES as string[]).includes(row.item_type)) return [];
    return [
      {
        itemType: row.item_type as MasteryItemType,
        tracked: row.tracked ?? 0,
        mastered: row.mastered ?? 0,
        avgMastery: Number(row.avg_mastery) || 0,
        accuracy: Number(row.accuracy) || 0,
      },
    ];
  });
}

export async function getKanjiOfTheDay(level: string): Promise<DailyKanji | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_kanji_of_the_day", { p_level: level });

  if (error) {
    console.error("Failed to load kanji of the day", error);
    return null;
  }

  const row = data?.[0];
  if (!row?.glyph) return null;

  return {
    id: row.kanji_id,
    glyph: row.glyph,
    meaning: (row.meanings ?? []).filter(Boolean).slice(0, 2).join(", ") || "—",
    reading: firstReading(row.reading_kun) ?? firstReading(row.reading_on),
    romaji: row.romaji || null,
    jlptLevel: row.jlpt_level,
    strokeCount: row.stroke_count ?? 0,
  };
}

/**
 * Derived notification feed plus the read marker.
 *
 * `unread` is computed against the profile's `notifications_seen_at` rather than
 * stored per item, because every entry here is derived from other tables — there
 * is no notification row to carry a read flag.
 */
export async function getNotifications(
  seenAt: string | null,
  limit = 8
): Promise<DashboardNotification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_notifications", { p_limit: limit });

  if (error) {
    console.error("Failed to load notifications", error);
    return [];
  }

  const seenAtMs = seenAt ? Date.parse(seenAt) : 0;

  return (data ?? []).flatMap((row) => {
    if (!(NOTIFICATION_KINDS as string[]).includes(row.kind)) return [];

    const occurredAtMs = row.occurred_at ? Date.parse(row.occurred_at) : Number.NaN;
    return [
      {
        kind: row.kind as NotificationKind,
        title: row.title,
        body: row.body,
        href: row.href,
        occurredAt: row.occurred_at ?? null,
        /* Undated entries (a due-review count with no timestamp) count as
           unread while they are still true, since they are standing prompts. */
        unread: Number.isNaN(occurredAtMs) ? true : occurredAtMs > seenAtMs,
      },
    ];
  });
}
