import { describe, expect, it } from "vitest";
import {
  buildKanjiReview,
  EMPTY_KANJI_NOTEBOOK,
  filterKanji,
  kanjiPronunciation,
  parseKanjiNotebook,
  prepareKanji,
} from "./kanji-study";

const rows = [
  {
    id: 1,
    character: "日",
    meaning_en: ["Sun", "Day"],
    meaning_hi: ["सूरज"],
    hiragana: "ひ",
    romaji: "hi",
    jlpt_level: "N5",
    order_index: 2,
    stroke_count: 4,
    tags: ["nature", "time"],
    onyomi: [{ reading: "ニチ", romaji: "nichi" }],
    kunyomi: [{ reading: "ひ", romaji: "hi" }],
  },
  {
    id: 2,
    character: "水",
    meaning_en: ["Water"],
    hiragana: "みず",
    romaji: "mizu",
    jlpt_level: "N5",
    order_index: 1,
    stroke_count: 4,
    tags: ["nature"],
  },
  {
    id: 3,
    character: "一",
    meaning_en: ["One"],
    hiragana: "ひと.つ / いち",
    romaji: "hitotsu",
    jlpt_level: "N5",
    order_index: 3,
    stroke_count: 1,
    tags: ["numbers"],
  },
];
const items = prepareKanji(rows);
const options = {
  query: "",
  tag: null,
  collection: "all" as const,
  sort: "course" as const,
  notebook: EMPTY_KANJI_NOTEBOOK,
};
describe("kanji study", () => {
  it("tolerates missing optional content and drops malformed nested entries", () => {
    const result = prepareKanji([
      { ...rows[0], vocabulary: [null, {}, { word: "日本" }], onyomi: [null, { reading: "ニチ" }] },
      { id: "bad" },
      null,
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].vocabulary).toEqual([
      { word: "日本", hiragana: "", romaji: "", hindi_pronunciation: "", hindi: "", english: "" },
    ]);
    expect(result[0].onyomi).toEqual([{ reading: "ニチ", romaji: "", hindi: "" }]);
    expect(result[0].related_kanji).toEqual([]);
  });
  it("finds On readings across scripts, Hindi meanings, and multiple terms", () => {
    for (const query of ["にち", "ﾆﾁ", "सूरज", " SUN   nichi "]) {
      expect(filterKanji(items, { ...options, query }).map((k) => k.id)).toEqual([1]);
    }
  });
  it("intersects search, topic, and the account's collection", () => {
    const notebook = { ...EMPTY_KANJI_NOTEBOOK, saved: [1, 3], familiar: [1] };
    expect(
      filterKanji(items, { ...options, notebook, collection: "saved", tag: "nature" }).map(
        (k) => k.id
      )
    ).toEqual([1]);
    expect(
      filterKanji(items, { ...options, notebook, collection: "new", tag: "nature" }).map(
        (k) => k.id
      )
    ).toEqual([2]);
    expect(
      filterKanji(items, { ...options, notebook, collection: "familiar", query: "water" })
    ).toEqual([]);
  });
  it("sorts without mutating the original learning order", () => {
    expect(filterKanji(items, { ...options, sort: "strokes" }).map((k) => k.id)).toEqual([3, 2, 1]);
    expect(items.map((k) => k.id)).toEqual([1, 2, 3]);
  });
  it("builds a capped, unique review and prioritizes unfamiliar characters", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ ...items[0], id: i + 1 }));
    const round = buildKanjiReview(many, [1, 2, 3, 4, 5], () => 0.3);
    expect(round).toHaveLength(10);
    expect(new Set(round.map((k) => k.id)).size).toBe(10);
    expect(round.every((k) => k.id > 5)).toBe(true);
    expect(buildKanjiReview([], [])).toEqual([]);
    expect(buildKanjiReview([items[0]], [])).toEqual([items[0]]);
  });
  it("reads only valid notebook IDs and preserves explicit display preferences", () => {
    expect(
      parseKanjiNotebook({
        saved: [1, 1, "2", null, -1],
        familiar: [3],
        showHindi: false,
        layout: "list",
      })
    ).toEqual({ saved: [1], familiar: [3], showHindi: false, layout: "list" });
    expect(parseKanjiNotebook(null)).toEqual(EMPTY_KANJI_NOTEBOOK);
  });
  it("speaks an explicit single reading without dictionary punctuation", () => {
    expect(kanjiPronunciation(items[2])).toBe("ひとつ");
    expect(kanjiPronunciation({ ...items[0], hiragana: "" })).toBe("ひ");
  });
});
