import { describe, expect, it } from "vitest";
import type { VocabularyWord } from "@japangolearn/database";
import {
  buildVocabularyQuiz,
  gradeVocabularyAnswer,
  hindiPronunciation,
  prepareVocabulary,
  primaryReading,
  searchVocabulary,
} from "./vocabulary-study";
const word = (patch: Partial<VocabularyWord> = {}): VocabularyWord => ({
  id: 1,
  kanji: "学校",
  hiragana: "がっこう",
  romaji: "gakkō",
  romaji_hindi: "गक्को",
  english: "School",
  topic: "School & Study",
  jlpt_level: "N5",
  icon: null,
  ...patch,
});
describe("vocabulary study", () => {
  it("merges repeated cards while preserving source IDs, meanings, and topics", () => {
    const entries = prepareVocabulary([
      word(),
      word({ id: 2, english: "School / Educational institution", topic: "Places & Buildings" }),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: 2,
      english: "School / Educational institution",
      sourceIds: [1, 2],
      topics: ["Places & Buildings", "School & Study"],
    });
    expect(searchVocabulary(entries, "", "School & Study")).toHaveLength(1);
  });
  it("does not collapse different written words with the same reading", () => {
    expect(
      prepareVocabulary([
        word({ kanji: "橋", hiragana: "はし" }),
        word({ id: 2, kanji: "箸", hiragana: "はし" }),
      ])
    ).toHaveLength(2);
  });
  it.each(["  school  ", "ガッコウ", "ｶﾞｯｺｳ", "gakkou", "gakko", "gakkō", "गक्को"])(
    "finds %s independently of pronunciation display",
    (query) => {
      expect(searchVocabulary(prepareVocabulary([word()]), query)).toHaveLength(1);
    }
  );
  it("rejects placeholder Hindi, including mixed Japanese text", () => {
    expect(hindiPronunciation("gakkou")).toBeNull();
    expect(hindiPronunciation("कीइरोイ")).toBeNull();
    expect(hindiPronunciation("कीइरो")).toBe("कीइरो");
  });
  it("speaks one reading rather than reading a slash-separated list", () => {
    expect(primaryReading(word({ hiragana: "なな / しち" }))).toBe("なな");
  });
  it("respects small filtered sets and offers distinct, non-overlapping meanings", () => {
    const entries = prepareVocabulary([
      word(),
      word({ id: 2, kanji: "大学", hiragana: "だいがく", english: "University" }),
      word({ id: 3, kanji: "学院", hiragana: "がくいん", english: "School / Academy" }),
      word({ id: 4, kanji: "猫", hiragana: "ねこ", english: "Cat" }),
      word({ id: 5, kanji: "犬", hiragana: "いぬ", english: "Dog" }),
    ]);
    const questions = buildVocabularyQuiz([entries.find((w) => w.id === 1)!], entries, 15);
    expect(questions).toHaveLength(1);
    expect(new Set(questions[0].options).size).toBe(4);
    expect(questions[0].options).not.toContain("School / Academy");
  });
  it("caps scored sets to the server-supported 15 questions", () => {
    const entries = prepareVocabulary(
      Array.from({ length: 30 }, (_, i) =>
        word({ id: i, kanji: `語${i}`, english: `Meaning ${i}` })
      )
    );
    expect(buildVocabularyQuiz(entries, entries, 20)).toHaveLength(15);
  });
  it("keeps the canonical row ID and English answer for server grading; skip is wrong", () => {
    const entry = prepareVocabulary([word()])[0];
    expect(gradeVocabularyAnswer(entry, "School", 100)).toMatchObject({
      itemType: "vocabulary",
      itemId: "1",
      answer: "School",
      isCorrect: true,
    });
    expect(gradeVocabularyAnswer(entry, "", 100)).toMatchObject({
      isCorrect: false,
      skipped: true,
    });
  });
});
