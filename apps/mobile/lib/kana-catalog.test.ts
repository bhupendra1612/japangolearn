import { describe, expect, it } from "vitest";
import type { Kana } from "@japangolearn/database";
import {
  auditKanaInventory,
  expectedKana,
  kanaBreakdown,
  prepareKana,
  type KanaType,
  KATAKANA_LOANWORDS,
} from "./kana-catalog";

function chart(type: KanaType): Kana[] {
  return expectedKana(type).map((item, index) => ({
    id: index + 1,
    character: item.character,
    type,
    romaji: "reading",
    romaji_hindi: "",
    group_name: item.group,
    sort_order: index + 1,
    stroke_count: 1,
    stroke_hint: "",
    is_combo: [...item.character].length > 1,
    is_dakuten: /[\u3099\u309a]/u.test(item.character.normalize("NFD")),
  }));
}

describe("kana inventory", () => {
  it.each(["hiragana", "katakana"] as const)("accounts for all standard %s rows", (type) => {
    const rows = chart(type);
    expect(new Set(rows.map((row) => row.character)).size).toBe(type === "katakana" ? 137 : 104);
    expect(kanaBreakdown(rows)).toEqual({
      basic: 46,
      marked: 25,
      combinations: 33,
      loanwords: type === "katakana" ? 33 : 0,
    });
    expect(auditKanaInventory(rows, type)).toEqual({ missing: [], duplicates: [] });
  });

  it("identifies the six omissions in the old 98-entry Katakana chart", () => {
    const missing = ["ギュ", "ギョ", "ビュ", "ビョ", "ピュ", "ピョ"];
    const rows = chart("katakana").filter(
      (row) => row.group_name !== "loanword" && !missing.includes(row.character)
    );
    expect(rows).toHaveLength(98);
    expect(auditKanaInventory(rows, "katakana").missing).toEqual([
      ...missing,
      ...KATAKANA_LOANWORDS,
    ]);
  });

  it("detects the missing loanword sounds in the 104-entry Katakana chart", () => {
    const rows = chart("katakana").filter((row) => row.group_name !== "loanword");
    expect(rows).toHaveLength(104);
    expect(auditKanaInventory(rows, "katakana").missing).toEqual(KATAKANA_LOANWORDS);
    expect(KATAKANA_LOANWORDS.filter((character) => [...character].length === 2)).toHaveLength(32);
    expect(expectedKana("hiragana").some((entry) => entry.group === "loanword")).toBe(false);
  });

  it("normalizes legacy group labels, deduplicates and keeps database IDs", () => {
    const rows = chart("hiragana");
    const vowel = { ...rows[0], id: 500, group_name: "Vowels (あ行)" };
    const prepared = prepareKana([rows[1], vowel, vowel, ...chart("katakana")], "hiragana");
    expect(prepared.map((row) => [row.id, row.character, row.group_name])).toEqual([
      [500, "あ", "a-row"],
      [2, "い", "a-row"],
    ]);
    expect(auditKanaInventory([vowel, vowel], "hiragana").duplicates).toEqual(["あ"]);
  });
});
