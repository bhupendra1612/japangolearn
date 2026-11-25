import type { Kana } from "@japangolearn/database";
import { isKatakanaLoanword } from "./kana-catalog";

/** Beginner notes for the modern chart; pronunciation stays behind its toggles. */
export function kanaLearningInfo(kana: Pick<Kana, "character" | "type">) {
  const letters = [...kana.character];
  const decomposed = kana.character.normalize("NFD");
  const mark = decomposed.includes("\u309a")
    ? "Handakuten"
    : decomposed.includes("\u3099")
      ? "Dakuten"
      : null;
  const combination = letters.length > 1;
  const loanword = isKatakanaLoanword(kana);
  const counterpart = loanword
    ? null
    : letters
        .map((letter) => {
          const code = letter.codePointAt(0)!;
          return String.fromCodePoint(code + (kana.type === "hiragana" ? 0x60 : -0x60));
        })
        .join("");
  const base = decomposed.replace(/[\u3099\u309a]/g, "").normalize("NFC");
  const tips = combination
    ? [
        "Write the first kana, then the small kana. Keep the second character smaller.",
        "Read the pair together as one beat, rather than two separate syllables.",
      ]
    : ["Watch where each stroke starts and ends, then trace the shape with your finger."];
  if (mark === "Handakuten")
    tips.push(
      "The small circle (゜) changes the sound. Write the base kana first, then add the circle."
    );
  if (mark === "Dakuten")
    tips.push(
      "The two short marks (゛) change the sound. Write the base kana first, then add the marks."
    );
  if (loanword) {
    tips.push(
      combination
        ? "Used in loanwords and foreign names. The small kana changes the sound of the whole pair."
        : "ヴ is ウ with dakuten. It represents a v sound in loanwords and is also used with small vowels."
    );
    tips.push(
      "Hindi is an approximate pronunciation guide; use Listen to hear the Japanese sound."
    );
  }
  return {
    counterpart,
    counterpartLabel: kana.type === "hiragana" ? "Katakana pair" : "Hiragana pair",
    kind: loanword ? "Loanword sound" : combination ? "Combination" : (mark ?? "Basic kana"),
    mark,
    composition: combination
      ? letters.join(" + ")
      : mark
        ? `${base} + ${mark === "Handakuten" ? "゜" : "゛"}`
        : null,
    tips,
  };
}
