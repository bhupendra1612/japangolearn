import { describe, expect, it } from "vitest";
import { kanaLearningInfo } from "./kana-learning-info";

describe("kana learning details", () => {
  it("pairs equivalent characters in both scripts", () => {
    expect(kanaLearningInfo({ character: "きゃ", type: "hiragana" })).toMatchObject({
      counterpart: "キャ",
      composition: "き + ゃ",
      kind: "Combination",
    });
    expect(kanaLearningInfo({ character: "キャ", type: "katakana" }).counterpart).toBe("きゃ");
  });
  it("distinguishes the handakuten circle from dakuten", () => {
    expect(kanaLearningInfo({ character: "ぱ", type: "hiragana" })).toMatchObject({
      kind: "Handakuten",
      composition: "は + ゜",
    });
    expect(kanaLearningInfo({ character: "バ", type: "katakana" })).toMatchObject({
      kind: "Dakuten",
      composition: "ハ + ゛",
    });
  });
  it("keeps sound-mark information for combinations", () => {
    expect(kanaLearningInfo({ character: "ピュ", type: "katakana" })).toMatchObject({
      kind: "Combination",
      mark: "Handakuten",
      composition: "ピ + ュ",
    });
  });
  it("explains loanword pairs without inventing a standard Hiragana counterpart", () => {
    expect(kanaLearningInfo({ character: "ティ", type: "katakana" })).toMatchObject({
      kind: "Loanword sound",
      counterpart: null,
      composition: "テ + ィ",
    });
    expect(kanaLearningInfo({ character: "ヴ", type: "katakana" })).toMatchObject({
      kind: "Loanword sound",
      counterpart: null,
      composition: "ウ + ゛",
      mark: "Dakuten",
    });
  });
});
