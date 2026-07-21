export const XP_PER_CORRECT = {
  vocabulary_quiz: 5,
  grammar_quiz: 5,
  writing_quiz: 5,
  practice_quiz: 10,
} as const;

export type QuizActivityType = keyof typeof XP_PER_CORRECT;

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
