import { createStaticClient } from "@/lib/supabase/static";

export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

/**
 * Levels the product currently intends to ship. Everything outside this list is
 * shown as a longer-term plan rather than something a learner can start today.
 */
export const OFFERED_LEVELS: JlptLevel[] = ["N5", "N4"];

export type LevelDefinition = {
  level: JlptLevel;
  label: string;
  kanji: string;
  color: string;
  summary: string;
};

export const JLPT_LEVELS: LevelDefinition[] = [
  {
    level: "N5",
    label: "Beginner",
    kanji: "入",
    color: "from-emerald-400 to-teal-600",
    summary: "Hiragana, katakana, and your first kanji",
  },
  {
    level: "N4",
    label: "Elementary",
    kanji: "学",
    color: "from-blue-400 to-indigo-600",
    summary: "Everyday grammar and wider vocabulary",
  },
  {
    level: "N3",
    label: "Intermediate",
    kanji: "語",
    color: "from-violet-400 to-purple-600",
    summary: "Conversational Japanese for daily life",
  },
  {
    level: "N2",
    label: "Upper-Intermediate",
    kanji: "読",
    color: "from-pink-400 to-rose-600",
    summary: "News, articles, and workplace Japanese",
  },
  {
    level: "N1",
    label: "Advanced",
    kanji: "極",
    color: "from-amber-400 to-orange-600",
    summary: "Complex texts and nuanced expression",
  },
];

export type LevelContent = { vocabulary: number; kanji: number; grammar: number };
export type CurriculumStats = {
  byLevel: Record<JlptLevel, LevelContent>;
  totals: LevelContent & { kana: number };
};

const EMPTY_LEVEL: LevelContent = { vocabulary: 0, kanji: 0, grammar: 0 };

function emptyStats(): CurriculumStats {
  return {
    byLevel: {
      N5: EMPTY_LEVEL,
      N4: EMPTY_LEVEL,
      N3: EMPTY_LEVEL,
      N2: EMPTY_LEVEL,
      N1: EMPTY_LEVEL,
    },
    totals: { vocabulary: 0, kanji: 0, grammar: 0, kana: 0 },
  };
}

function tally(rows: { jlpt_level: string | null }[] | null) {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    const level = row.jlpt_level?.toUpperCase();
    if (level) counts.set(level, (counts.get(level) ?? 0) + 1);
  }
  return counts;
}

/**
 * Reads what the curriculum actually contains, so public claims and indexable
 * URLs track the database instead of hard-coded marketing numbers. Callers are
 * expected to cache this (the marketing pages revalidate hourly).
 *
 * Never throws: the home page and sitemap must still render if Supabase is
 * unreachable, so a failed read degrades to "no content yet" rather than an error.
 */
export async function getCurriculumStats(): Promise<CurriculumStats> {
  try {
    const supabase = createStaticClient();
    const [vocabulary, kanji, grammar, kana] = await Promise.all([
      supabase.from("vocabulary").select("jlpt_level"),
      supabase.from("kanji").select("jlpt_level"),
      supabase.from("grammar_patterns").select("jlpt_level"),
      supabase.from("kana").select("id", { count: "exact", head: true }),
    ]);

    const vocabularyByLevel = tally(vocabulary.data);
    const kanjiByLevel = tally(kanji.data);
    const grammarByLevel = tally(grammar.data);

    const stats = emptyStats();
    for (const { level } of JLPT_LEVELS) {
      stats.byLevel[level] = {
        vocabulary: vocabularyByLevel.get(level) ?? 0,
        kanji: kanjiByLevel.get(level) ?? 0,
        grammar: grammarByLevel.get(level) ?? 0,
      };
    }

    stats.totals = {
      vocabulary: vocabulary.data?.length ?? 0,
      kanji: kanji.data?.length ?? 0,
      grammar: grammar.data?.length ?? 0,
      kana: kana.count ?? 0,
    };

    return stats;
  } catch {
    return emptyStats();
  }
}

export function hasContent(content: LevelContent) {
  return content.vocabulary + content.kanji + content.grammar > 0;
}

/** Levels a learner can actually start today, in curriculum order. */
export function availableLevels(stats: CurriculumStats): JlptLevel[] {
  return JLPT_LEVELS.filter(({ level }) => hasContent(stats.byLevel[level])).map(
    ({ level }) => level
  );
}
