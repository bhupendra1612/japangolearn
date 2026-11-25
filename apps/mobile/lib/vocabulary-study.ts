import type { VocabularyWord } from "@japangolearn/database";
import type { GradedAnswer } from "@japangolearn/core";
import { shuffle } from "./kana-practice";

export type StudyWord = VocabularyWord & {
  key: string;
  sourceIds: number[];
  topics: string[];
  meanings: string[];
};
export const writtenWord = (word: VocabularyWord) => word.kanji?.trim() || word.hiragana.trim();
const clean = (text: string) => text.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
export const vocabularyKey = (word: VocabularyWord) =>
  `${writtenWord(word)}|${word.hiragana.trim()}`;

/** Never present a copied Latin reading or mixed-script placeholder as Hindi. */
export function hindiPronunciation(value: string | null) {
  const text = value?.trim() ?? "";
  return /[\u0900-\u097f]/u.test(text) && !/[A-Za-z\u3040-\u30ff]/u.test(text) ? text : null;
}

/** Collapse duplicate cards, keeping every source ID and topic for links and lists.
 * Keep a real row's English answer/ID together so the server can grade it. */
export function prepareVocabulary(rows: readonly VocabularyWord[]): StudyWord[] {
  const groups = new Map<string, VocabularyWord[]>();
  for (const row of rows) {
    if (!row.hiragana.trim() || !row.english.trim()) continue;
    const key = vocabularyKey(row);
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups]
    .map(([key, group]) => {
      const sorted = [...group].sort((a, b) => b.english.length - a.english.length || a.id - b.id);
      const primary = sorted[0];
      return {
        ...primary,
        icon: sorted.find((word) => word.icon?.trim())?.icon ?? null,
        key,
        sourceIds: group.map((word) => word.id),
        topics: [...new Set(group.map((word) => word.topic))].sort(),
        meanings: [...new Map(sorted.map((word) => [clean(word.english), word.english])).values()],
        romaji_hindi:
          sorted.map((word) => hindiPronunciation(word.romaji_hindi)).find(Boolean) ?? null,
      };
    })
    .sort((a, b) => a.hiragana.localeCompare(b.hiragana, "ja") || a.id - b.id);
}

export function normalizeVocabularySearch(value: string) {
  return clean(value)
    .replace(/[ァ-ヶ]/g, (letter) => String.fromCharCode(letter.charCodeAt(0) - 0x60))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ou/g, "o")
    .replace(/([aeiou])\1+/g, "$1")
    .replace(/[\s'’\-]/g, "");
}

export function searchVocabulary(words: readonly StudyWord[], query: string, topic = "All") {
  const terms = query.trim().split(/\s+/).filter(Boolean).map(normalizeVocabularySearch);
  return words.filter(
    (word) =>
      (topic === "All" || word.topics.includes(topic)) &&
      terms.every((term) =>
        [
          writtenWord(word),
          word.hiragana,
          word.romaji,
          word.romaji_hindi ?? "",
          ...word.meanings,
        ].some((field) => normalizeVocabularySearch(field).includes(term))
      )
  );
}

export function primaryReading(word: VocabularyWord) {
  // Slash-separated alternatives are separate readings, not a spoken sentence.
  return word.hiragana.split(/[\/／]/)[0].trim();
}

export type VocabularyQuestion = { word: StudyWord; options: string[] };
export type VocabularyAnswer = GradedAnswer & { word: StudyWord; skipped: boolean };
const meaningParts = (word: StudyWord) =>
  word.meanings.flatMap((meaning) => meaning.split(/[\/;]/).map(clean));

export function buildVocabularyQuiz(
  candidates: readonly StudyWord[],
  all: readonly StudyWord[],
  count: number
): VocabularyQuestion[] {
  const unique = [...new Map(candidates.map((word) => [word.key, word])).values()];
  return shuffle(unique)
    .slice(0, Math.max(0, Math.min(15, count)))
    .map((word) => {
      const targetParts = new Set(meaningParts(word));
      const others = shuffle(all).filter(
        (other) =>
          other.key !== word.key && !meaningParts(other).some((part) => targetParts.has(part))
      );
      const options = new Map<string, string>();
      // Same-topic distractors first, then other topics if needed.
      for (const other of [
        ...others.filter((w) => w.topics.some((t) => word.topics.includes(t))),
        ...others,
      ]) {
        options.set(clean(other.english), other.english);
      }
      return { word, options: shuffle([word.english, ...[...options.values()].slice(0, 3)]) };
    });
}

export function gradeVocabularyAnswer(
  word: StudyWord,
  answer: string,
  responseMs: number
): VocabularyAnswer {
  return {
    word,
    itemType: "vocabulary",
    itemId: String(word.id),
    prompt: writtenWord(word),
    answer,
    correctAnswer: word.english,
    isCorrect: clean(answer) === clean(word.english),
    skipped: answer === "",
    responseMs: Math.max(0, responseMs),
  };
}
