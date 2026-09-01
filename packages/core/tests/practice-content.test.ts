import { describe, expect, it } from "vitest";
import { buildPracticeStudyItems } from "../src/practice-content";

describe("buildPracticeStudyItems", () => {
  it("hydrates all supported practice content types", () => {
    const items = buildPracticeStudyItems(
      [
        {
          id: "list-vocab",
          item_type: "vocabulary",
          item_id: 1,
          mastery_score: 12,
          last_reviewed: null,
        },
        { id: "list-kana", item_type: "kana", item_id: 2, mastery_score: 24, last_reviewed: null },
        {
          id: "list-kanji",
          item_type: "kanji",
          item_id: 3,
          mastery_score: 36,
          last_reviewed: null,
        },
        {
          id: "list-grammar",
          item_type: "grammar",
          item_id: 4,
          mastery_score: 48,
          last_reviewed: null,
        },
      ],
      {
        vocabulary: [
          {
            id: 1,
            kanji: "食べる",
            hiragana: "たべる",
            english: "to eat",
            romaji: "taberu",
            romaji_hindi: "taberu",
          },
        ],
        kana: [
          { id: 2, character: "あ", romaji: "a", romaji_hindi: "a", type: "hiragana" },
        ],
        kanji: [
          {
            id: 3,
            character: "日",
            hiragana: "ひ",
            meaning_en: ["day", "sun"],
            meaning_hi: ["दिन", "सूरज"],
            romaji: "hi",
          },
        ],
        grammar: [{ id: 4, title: "ている", pattern: "Vている", meaning: "ongoing action" }],
      }
    );

    expect(items).toEqual([
      {
        listItemId: "list-vocab",
        itemType: "vocabulary",
        itemId: "1",
        front: "食べる",
        back: "to eat",
        correctAnswer: "to eat",
        audioText: "たべる",
        reading: "たべる",
        romaji: "taberu",
        romajiHindi: "taberu",
        english: "to eat",
        masteryScore: 12,
        lastReviewed: null,
      },
      {
        listItemId: "list-kana",
        itemType: "kana",
        itemId: "2",
        front: "あ",
        back: "a",
        correctAnswer: "a",
        audioText: "あ",
        romaji: "a",
        romajiHindi: "a",
        kanaType: "hiragana",
        masteryScore: 24,
        lastReviewed: null,
      },
      {
        listItemId: "list-kanji",
        itemType: "kanji",
        itemId: "3",
        front: "日",
        back: "day, sun",
        correctAnswer: "day, sun",
        audioText: "ひ",
        reading: "ひ",
        romaji: "hi",
        english: "day, sun",
        meaningHindi: "दिन, सूरज",
        masteryScore: 36,
        lastReviewed: null,
      },
      {
        listItemId: "list-grammar",
        itemType: "grammar",
        itemId: "4",
        front: "Vている",
        back: "ongoing action",
        correctAnswer: "ongoing action",
        audioText: "Vている",
        english: "ongoing action",
        masteryScore: 48,
        lastReviewed: null,
      },
    ]);
  });

  it("drops unsupported and missing content instead of inventing a kana card", () => {
    const items = buildPracticeStudyItems(
      [
        { id: "missing", item_type: "kanji", item_id: 99, mastery_score: 0, last_reviewed: null },
        {
          id: "unsupported",
          item_type: "audio",
          item_id: 1,
          mastery_score: 0,
          last_reviewed: null,
        },
      ],
      { vocabulary: [], kana: [], kanji: [], grammar: [] }
    );

    expect(items).toEqual([]);
  });
});
