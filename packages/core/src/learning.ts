export const XP_PER_CORRECT = {
  vocabulary_quiz: 5,
  grammar_quiz: 5,
  writing_quiz: 5,
  practice_quiz: 10,
  /* Reviews pay less than fresh practice so a large due queue cannot be farmed. */
  review_session: 3,
} as const;

export type QuizActivityType = keyof typeof XP_PER_CORRECT;

/** Content families that carry an independent mastery record. */
export const MASTERY_ITEM_TYPES = ["vocabulary", "kana", "kanji", "grammar"] as const;

export type MasteryItemType = (typeof MASTERY_ITEM_TYPES)[number];

/**
 * One graded question, sent to `award_xp` alongside the aggregate score. This is
 * the signal that drives `learning_attempt_answers` and the spaced-repetition
 * schedule in `mastery_records` — without it the server only learns "7 of 10"
 * and can never tell which items a learner is failing.
 */
export type GradedAnswer = {
  itemType: MasteryItemType;
  itemId: string;
  isCorrect: boolean;
  prompt?: string;
  answer?: string;
  correctAnswer?: string;
  responseMs?: number;
};

/** Wire shape the database function expects (snake_case, JSON-safe). */
export type GradedAnswerPayload = {
  item_type: MasteryItemType;
  item_id: string;
  is_correct: boolean;
  prompt?: string;
  answer?: string;
  correct_answer?: string;
  response_ms?: number;
};

const MAX_TEXT = 400;

function trim(value: string | undefined) {
  if (!value) return undefined;
  const clean = value.trim();
  return clean.length === 0 ? undefined : clean.slice(0, MAX_TEXT);
}

/**
 * Drops entries the database would reject anyway, so one malformed question
 * cannot cost a learner their finished quiz.
 */
export function toGradedAnswerPayload(answers: GradedAnswer[]): GradedAnswerPayload[] {
  return answers
    .filter(
      (entry) =>
        MASTERY_ITEM_TYPES.includes(entry.itemType) &&
        typeof entry.itemId === "string" &&
        entry.itemId.length > 0 &&
        entry.itemId.length <= 64 &&
        typeof entry.isCorrect === "boolean"
    )
    .map((entry) => ({
      item_type: entry.itemType,
      item_id: entry.itemId,
      is_correct: entry.isCorrect,
      prompt: trim(entry.prompt),
      answer: trim(entry.answer),
      correct_answer: trim(entry.correctAnswer),
      response_ms:
        Number.isFinite(entry.responseMs) && (entry.responseMs as number) >= 0
          ? Math.min(Math.round(entry.responseMs as number), 3_600_000)
          : undefined,
    }));
}

export type QuizScore = {
  correctAnswers: number;
  totalQuestions: number;
  accuracyPercent: number;
  xpAwarded: number;
};

export function calculateQuizScore(
  activityType: QuizActivityType,
  correctAnswers: number,
  totalQuestions: number
): QuizScore {
  if (
    !Number.isInteger(correctAnswers) ||
    !Number.isInteger(totalQuestions) ||
    totalQuestions < 1 ||
    correctAnswers < 0 ||
    correctAnswers > totalQuestions
  ) {
    throw new RangeError("Quiz score must contain valid whole-number counts.");
  }

  return {
    correctAnswers,
    totalQuestions,
    accuracyPercent: Math.round((correctAnswers / totalQuestions) * 10_000) / 100,
    xpAwarded: correctAnswers * XP_PER_CORRECT[activityType],
  };
}

export type XpLevelProgress = {
  level: number;
  current: number;
  needed: number;
  remaining: number;
  progress: number;
};

export function getXpLevelProgress(totalXp: number, baseXp = 100): XpLevelProgress {
  const safeXp = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;
  const safeBase = Number.isFinite(baseXp) ? Math.max(1, Math.floor(baseXp)) : 100;
  let level = 1;
  let current = safeXp;

  while (current >= level * safeBase) {
    current -= level * safeBase;
    level += 1;
  }

  const needed = level * safeBase;
  return {
    level,
    current,
    needed,
    remaining: needed - current,
    progress: current / needed,
  };
}

export function calculateStreak({
  currentStreak,
  longestStreak,
  lastPracticeDate,
  practiceDate,
}: {
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  practiceDate: string;
}) {
  if (!lastPracticeDate) {
    return { currentStreak: 1, longestStreak: Math.max(1, longestStreak) };
  }

  const last = Date.parse(`${lastPracticeDate}T00:00:00Z`);
  const current = Date.parse(`${practiceDate}T00:00:00Z`);
  if (!Number.isFinite(last) || !Number.isFinite(current) || current < last) {
    throw new RangeError("Streak dates must be valid and chronological.");
  }

  const dayDifference = Math.round((current - last) / 86_400_000);
  const nextCurrent =
    dayDifference === 0 ? currentStreak : dayDifference === 1 ? currentStreak + 1 : 1;

  return {
    currentStreak: nextCurrent,
    longestStreak: Math.max(longestStreak, nextCurrent),
  };
}
