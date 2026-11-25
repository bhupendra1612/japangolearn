import type { Kana } from "@japangolearn/database";

export type KanaType = "hiragana" | "katakana";

// Modern beginner chart: 46 basic kana, 25 marked kana and 33 yoon pairs.
// Katakana also includes the 33 loanword sounds in the official Tables 1/2.
// Small kana are used inside the pairs; 104 is a learning-entry count, not
// the number of letters in the basic alphabet. Historical kana are excluded.
// Reference: https://www.erin.jpf.go.jp/en/extra/syllabary/
const HIRAGANA_ROWS = [
  ["a-row", "あ い う え お"],
  ["ka-row", "か き く け こ"],
  ["sa-row", "さ し す せ そ"],
  ["ta-row", "た ち つ て と"],
  ["na-row", "な に ぬ ね の"],
  ["ha-row", "は ひ ふ へ ほ"],
  ["ma-row", "ま み む め も"],
  ["ya-row", "や ゆ よ"],
  ["ra-row", "ら り る れ ろ"],
  ["wa-row", "わ を"],
  ["n-row", "ん"],
  ["ga-row", "が ぎ ぐ げ ご"],
  ["za-row", "ざ じ ず ぜ ぞ"],
  ["da-row", "だ ぢ づ で ど"],
  ["ba-row", "ば び ぶ べ ぼ"],
  ["pa-row", "ぱ ぴ ぷ ぺ ぽ"],
  [
    "combo",
    "きゃ きゅ きょ しゃ しゅ しょ ちゃ ちゅ ちょ にゃ にゅ にょ ひゃ ひゅ ひょ みゃ みゅ みょ りゃ りゅ りょ ぎゃ ぎゅ ぎょ じゃ じゅ じょ びゃ びゅ びょ ぴゃ ぴゅ ぴょ",
  ],
] as const;

// 32 combinations plus standalone ヴ. These are learning entries, not 33
// additional letters. Other specialized foreign transcriptions are open-ended.
// Reference: https://kotoba.ninjal.ac.jp/qa/yokuaru/qa-195/
export const KATAKANA_LOANWORDS = (
  "イェ ウィ ウェ ウォ シェ ジェ チェ ツァ ツィ ツェ ツォ " +
  "ティ ディ トゥ ドゥ テュ デュ ファ フィ フェ フォ フュ " +
  "ヴ ヴァ ヴィ ヴェ ヴォ ヴュ クァ クィ クェ クォ グァ"
).split(" ");

export function isKatakanaLoanword(kana: Pick<Kana, "character" | "type">) {
  return kana.type === "katakana" && KATAKANA_LOANWORDS.includes(kana.character);
}

function katakana(character: string) {
  return [...character].map((letter) => String.fromCharCode(letter.charCodeAt(0) + 0x60)).join("");
}

export function expectedKana(type: KanaType) {
  const beginner = HIRAGANA_ROWS.flatMap(([group, characters]) =>
    characters.split(" ").map((character) => ({
      character: type === "hiragana" ? character : katakana(character),
      group,
    }))
  );
  return type === "hiragana"
    ? beginner
    : [...beginner, ...KATAKANA_LOANWORDS.map((character) => ({ character, group: "loanword" }))];
}

export function auditKanaInventory(rows: readonly Kana[], type: KanaType) {
  const characters = rows.filter((row) => row.type === type).map((row) => row.character);
  const available = new Set(characters);
  return {
    missing: expectedKana(type)
      .filter((item) => !available.has(item.character))
      .map((item) => item.character),
    duplicates: [
      ...new Set(characters.filter((character, index) => characters.indexOf(character) !== index)),
    ],
  };
}

export function prepareKana(rows: readonly Kana[], type: KanaType): Kana[] {
  const chart = new Map(
    expectedKana(type).map((item, index) => [item.character, { ...item, index }])
  );
  const seen = new Set<string>();
  return rows
    .filter((row) => {
      if (row.type !== type || seen.has(row.character)) return false;
      seen.add(row.character);
      return true;
    })
    .map((row) => ({ ...row, group_name: chart.get(row.character)?.group ?? row.group_name }))
    .sort(
      (a, b) =>
        (chart.get(a.character)?.index ?? chart.size + a.sort_order) -
        (chart.get(b.character)?.index ?? chart.size + b.sort_order)
    );
}

export function kanaBreakdown(rows: readonly Kana[]) {
  const beginner = rows.filter((row) => !isKatakanaLoanword(row));
  return {
    basic: beginner.filter((row) => !row.is_dakuten && !row.is_combo).length,
    marked: beginner.filter((row) => row.is_dakuten && !row.is_combo).length,
    combinations: beginner.filter((row) => row.is_combo).length,
    loanwords: rows.filter(isKatakanaLoanword).length,
  };
}
