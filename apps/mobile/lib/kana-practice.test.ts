import { describe, expect, it } from "vitest";
import type { Kana } from "@japangolearn/database";
import { expectedKana } from "./kana-catalog";
import {
  buildKanaPractice,
  gradeKanaAnswer,
  practiceCandidates,
  practiceCompliment,
  practiceSummary,
} from "./kana-practice";

const kana: Kana[] = expectedKana("hiragana").map((entry, index) => ({
  id: index + 1,
  type: "hiragana",
  character: entry.character,
  romaji: `reading${index}`,
  romaji_hindi: null,
  stroke_hint: null,
  group_name: entry.group,
  sort_order: index,
  stroke_count: 3,
  is_combo: entry.group === "combo",
  is_dakuten: index >= 46 && index < 71,
}));

describe("kana practice sessions", () => {
  it.each([10, 15, 20])("makes a %i-question set without repeated kana", (size) => {
    const questions = buildKanaPractice(kana, kana, size);
    expect(questions).toHaveLength(size);
    expect(new Set(questions.map((q) => q.kana.character)).size).toBe(size);
    expect(questions.every((q) => q.options.length === 4 && new Set(q.options).size === 4)).toBe(
      true
    );
  });
  it("uses each character once when a group is smaller than the requested set", () => {
    expect(buildKanaPractice(kana.slice(0, 3), kana, 20)).toHaveLength(3);
    expect(buildKanaPractice([], kana, 10)).toEqual([]);
  });
  it("removes duplicate readings, including a distractor matching the answer", () => {
    const target = { ...kana[0], romaji: "ji" };
    const all = [
      target,
      { ...kana[1], romaji: "ji" },
      { ...kana[2], romaji: " JI " },
      { ...kana[3], romaji: "zu" },
      { ...kana[4], romaji: "zu" },
    ];
    const options = buildKanaPractice([target], all, 1)[0].options;
    expect(options.sort()).toEqual(["ji", "zu"]);
  });
  it("keeps complete small-kana combinations and uses the requested content scope", () => {
    const combos = practiceCandidates(kana, "combinations", "All");
    expect(combos).toHaveLength(33);
    expect(
      buildKanaPractice(combos, kana, 20).every((q) => [...q.kana.character].length === 2)
    ).toBe(true);
    expect(practiceCandidates(kana, "basic", "All")).toHaveLength(46);
    expect(practiceCandidates(kana, "marked", "All")).toHaveLength(25);
  });
  it("counts skipped answers and hints honestly and identifies only missed kana", () => {
    const answers = [
      gradeKanaAnswer(kana[0], kana[0].romaji, false, 500),
      gradeKanaAnswer(kana[1], "", true, 100),
      gradeKanaAnswer(kana[2], kana[2].romaji, false, 100),
    ];
    const result = practiceSummary(answers);
    expect(result).toMatchObject({ correct: 2, total: 3, percent: 67, hinted: 1, bestStreak: 1 });
    expect(result.mistakes).toHaveLength(1);
    expect(result.mistakes[0].skipped).toBe(true);
  });
  it("includes loanword pairs in combinations and gives loanwords their own practice scope", () => {
    const katakana: Kana[] = expectedKana("katakana").map((entry, index) => ({
      ...kana[0],
      id: index + 200,
      type: "katakana",
      character: entry.character,
      romaji: `sound${index}`,
      group_name: entry.group,
      is_combo: [...entry.character].length > 1,
      is_dakuten: /[\u3099\u309a]/u.test(entry.character.normalize("NFD")),
    }));
    const loanwords = practiceCandidates(katakana, "loanwords", "All");
    expect(loanwords).toHaveLength(33);
    expect(loanwords.map((k) => k.character)).toEqual(
      expect.arrayContaining(["ファ", "ティ", "ウィ", "ヴ"])
    );
    expect(practiceCandidates(katakana, "basic", "All")).toHaveLength(46);
    expect(practiceCandidates(katakana, "marked", "All")).toHaveLength(25);
    expect(practiceCandidates(katakana, "combinations", "All")).toHaveLength(65);
    expect(practiceCandidates(kana, "loanwords", "All")).toHaveLength(0);
    const questions = buildKanaPractice(loanwords, katakana, 20);
    expect(questions).toHaveLength(20);
    expect(
      questions.every((q) => q.kana.group_name === "loanword" && q.options.includes(q.kana.romaji))
    ).toBe(true);
  });
  it.each([
    [49, "First steps"],
    [50, "Keep growing"],
    [70, "Finding your rhythm"],
    [80, "Strong progress"],
    [90, "Kana star"],
    [100, "Perfect 100"],
  ])("gives the right milestone at %i percent", (score, badge) => {
    expect(practiceCompliment(Number(score)).badge).toBe(badge);
    expect(practiceCompliment(Number(score)).celebrate).toBe(Number(score) >= 90);
  });
});
