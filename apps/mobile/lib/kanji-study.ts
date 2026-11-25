import type { Kanji } from "@japangolearn/database";

export type KanjiCollection = "all" | "saved" | "new" | "familiar";
export type KanjiSort = "course" | "strokes" | "meaning";
export type KanjiNotebook = {
  saved: number[];
  familiar: number[];
  showHindi: boolean;
  layout: "grid" | "list";
};
export const EMPTY_KANJI_NOTEBOOK: KanjiNotebook = {
  saved: [],
  familiar: [],
  showHindi: true,
  layout: "grid",
};

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter((entry): entry is string => typeof entry === "string" && !!entry.trim())
        .map((entry) => entry.trim())
    : [];
const records = (value: unknown) => (Array.isArray(value) ? value.map(record) : []);

/** Content JSON is editable independently of the app. Missing optional fields must not crash a lesson. */
export function prepareKanji(value: unknown): Kanji[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = record(entry);
    const meaning = strings(row.meaning_en);
    if (!Number.isInteger(row.id) || !text(row.character) || !meaning.length) return [];
    const readings = (data: unknown) =>
      records(data)
        .map((r) => ({ reading: text(r.reading), romaji: text(r.romaji), hindi: text(r.hindi) }))
        .filter((r) => r.reading);
    return [
      {
        id: row.id as number,
        character: text(row.character),
        icon: text(row.icon),
        hiragana: text(row.hiragana),
        romaji: text(row.romaji),
        hindi_pronunciation: text(row.hindi_pronunciation),
        meaning_en: meaning,
        meaning_hi: strings(row.meaning_hi),
        stroke_count: typeof row.stroke_count === "number" ? row.stroke_count : 0,
        radical: text(row.radical),
        jlpt_level: text(row.jlpt_level),
        order_index: typeof row.order_index === "number" ? row.order_index : (row.id as number),
        frequency_rank: text(row.frequency_rank) || null,
        mnemonic: text(row.mnemonic) || null,
        writing_tip: text(row.writing_tip) || null,
        kunyomi: readings(row.kunyomi),
        onyomi: readings(row.onyomi),
        vocabulary: records(row.vocabulary)
          .map((v) => ({
            word: text(v.word),
            hiragana: text(v.hiragana),
            romaji: text(v.romaji),
            hindi_pronunciation: text(v.hindi_pronunciation),
            hindi: text(v.hindi),
            english: text(v.english),
          }))
          .filter((v) => v.word || v.hiragana),
        example_sentences: records(row.example_sentences)
          .map((e) => ({
            jp: text(e.jp),
            hiragana: text(e.hiragana),
            romaji: text(e.romaji),
            hindi_pronunciation: text(e.hindi_pronunciation),
            hindi: text(e.hindi),
            english: text(e.english),
          }))
          .filter((e) => e.jp),
        related_kanji: strings(row.related_kanji),
        confusable_kanji: strings(row.confusable_kanji),
        tags: strings(row.tags),
      },
    ];
  });
}

export function parseKanjiNotebook(value: unknown): KanjiNotebook {
  const row = record(value);
  const ids = (data: unknown) =>
    Array.isArray(data)
      ? [...new Set(data.filter((id): id is number => Number.isInteger(id) && Number(id) > 0))]
      : [];
  return {
    saved: ids(row.saved),
    familiar: ids(row.familiar),
    showHindi: row.showHindi !== false,
    layout: row.layout === "list" ? "list" : "grid",
  };
}

export function normalizeKanjiSearch(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function filterKanji(
  items: readonly Kanji[],
  options: {
    query: string;
    tag: string | null;
    collection: KanjiCollection;
    sort: KanjiSort;
    notebook: KanjiNotebook;
  }
) {
  const terms = normalizeKanjiSearch(options.query).split(/\s+/).filter(Boolean);
  return items
    .filter((item) => {
      const familiar = options.notebook.familiar.includes(item.id);
      if (options.collection === "saved" && !options.notebook.saved.includes(item.id)) return false;
      if (options.collection === "familiar" && !familiar) return false;
      if (options.collection === "new" && familiar) return false;
      if (options.tag && !item.tags.includes(options.tag)) return false;
      const fields = [
        item.character,
        item.hiragana,
        item.romaji,
        item.radical,
        item.hindi_pronunciation,
        ...item.meaning_en,
        ...item.meaning_hi,
        ...item.tags,
        ...[...item.kunyomi, ...item.onyomi].flatMap((r) => [r.reading, r.romaji, r.hindi]),
      ].map(normalizeKanjiSearch);
      return terms.every((term) => fields.some((field) => field.includes(term)));
    })
    .sort((a, b) => {
      if (options.sort === "strokes")
        return a.stroke_count - b.stroke_count || a.order_index - b.order_index;
      if (options.sort === "meaning") return a.meaning_en[0].localeCompare(b.meaning_en[0]);
      return a.order_index - b.order_index;
    });
}

/** Self-assessment only. This never submits client-awarded mastery or XP. */
export function buildKanjiReview(
  items: readonly Kanji[],
  familiar: readonly number[],
  random = Math.random
): Kanji[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled
    .sort((a, b) => Number(familiar.includes(a.id)) - Number(familiar.includes(b.id)))
    .slice(0, 10);
}

/** Prefer one explicit reading over asking TTS to guess an isolated kanji. */
export function kanjiPronunciation(item: Kanji): string {
  return (item.hiragana || item.kunyomi[0]?.reading || item.onyomi[0]?.reading || item.character)
    .split(/[\/／、,]/)[0]
    .replace(/[.・]/g, "")
    .trim();
}
