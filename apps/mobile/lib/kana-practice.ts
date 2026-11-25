import type { Kana } from "@japangolearn/database";
import type { GradedAnswer } from "@japangolearn/core";
import { isKatakanaLoanword } from "./kana-catalog";

export type PracticeScope = "all" | "basic" | "marked" | "combinations" | "loanwords" | "current";
export type PracticeQuestion = { kana: Kana; options: string[] };
export type PracticeAnswer = GradedAnswer & { kana: Kana; usedHint: boolean; skipped: boolean };

const normalize = (value: string) => value.trim().toLowerCase();

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function practiceCandidates(kana: readonly Kana[], scope: PracticeScope, group: string) {
  return kana.filter((item) => {
    if (scope === "basic") return !item.is_combo && !item.is_dakuten && !isKatakanaLoanword(item);
    if (scope === "marked") return item.is_dakuten && !item.is_combo && !isKatakanaLoanword(item);
    if (scope === "combinations") return item.is_combo;
    if (scope === "loanwords") return isKatakanaLoanword(item);
    if (scope === "current") return item.group_name === group;
    return true;
  });
}

export function buildKanaPractice(
  candidates: readonly Kana[],
  allKana: readonly Kana[],
  requested: number,
  random = Math.random
): PracticeQuestion[] {
  const unique = [
    ...new Map(candidates.filter((k) => k.romaji.trim()).map((k) => [k.character, k])).values(),
  ];
  return shuffle(unique, random)
    .slice(0, Math.max(0, Math.floor(requested)))
    .map((kana) => {
      const others = allKana.filter(
        (k) => k.type === kana.type && normalize(k.romaji) !== normalize(kana.romaji)
      );
      // Prefer comparable sounds, but still offer choices for a one-character group.
      const preferred = others.filter((k) => k.is_combo === kana.is_combo);
      const fallback = others.filter((k) => k.is_combo !== kana.is_combo);
      const readings = new Map<string, string>();
      for (const item of [...shuffle(preferred, random), ...shuffle(fallback, random)]) {
        if (item.romaji.trim()) readings.set(normalize(item.romaji), item.romaji.trim());
      }
      return {
        kana,
        options: shuffle([kana.romaji.trim(), ...[...readings.values()].slice(0, 3)], random),
      };
    });
}

export function gradeKanaAnswer(
  kana: Kana,
  answer: string,
  usedHint: boolean,
  responseMs: number
): PracticeAnswer {
  return {
    kana,
    itemType: "kana",
    itemId: String(kana.id),
    prompt: kana.character,
    answer,
    correctAnswer: kana.romaji,
    isCorrect: normalize(answer) === normalize(kana.romaji),
    usedHint,
    skipped: answer === "",
    responseMs: Math.max(0, responseMs),
  };
}

export function practiceSummary(answers: readonly PracticeAnswer[]) {
  const correct = answers.filter((a) => a.isCorrect).length;
  let streak = 0,
    bestStreak = 0;
  for (const answer of answers) {
    streak = answer.isCorrect ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
  }
  return {
    correct,
    total: answers.length,
    percent: answers.length ? Math.round((correct / answers.length) * 100) : 0,
    hinted: answers.filter((a) => a.usedHint).length,
    bestStreak,
    mistakes: answers.filter((a) => !a.isCorrect),
  };
}

export function practiceCompliment(percent: number, subject: "kana" | "words" = "kana") {
  const sound = subject === "words" ? "word" : "sound";
  if (percent >= 100)
    return {
      title: "Perfect set!",
      message: "Every answer correct. Your practice is paying off!",
      badge: "Perfect 100",
      celebrate: true,
    };
  if (percent >= 90)
    return {
      title: "Outstanding work!",
      message: `You know these ${subject} well. Review the last few and aim for a perfect set.`,
      badge: subject === "words" ? "Vocabulary star" : "Kana star",
      celebrate: true,
    };
  if (percent >= 80)
    return {
      title: "You're getting strong!",
      message: `A strong result. A little more review will make these ${sound}s stick.`,
      badge: "Strong progress",
      celebrate: false,
    };
  if (percent >= 70)
    return {
      title: "Great progress!",
      message: `You're building confidence. Try your missed ${subject} once more.`,
      badge: "Finding your rhythm",
      celebrate: false,
    };
  if (percent >= 50)
    return {
      title: "Good effort!",
      message: `You've learned a lot already. Take your time with the ${sound}s you missed.`,
      badge: "Keep growing",
      celebrate: false,
    };
  return {
    title: "Every try helps!",
    message: `Start with a smaller group, listen to each ${sound}, and try again. You've got this.`,
    badge: "First steps",
    celebrate: false,
  };
}
