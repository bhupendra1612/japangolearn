export const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;

export type JlptLevel = (typeof JLPT_LEVELS)[number];

export const LEARNING_AREAS = [
  "hiragana",
  "katakana",
  "kanji",
  "vocabulary",
  "grammar",
  "practice",
] as const;

export type LearningArea = (typeof LEARNING_AREAS)[number];

export const XP_LEVEL_BASE = 100;

export type XpLevelProgress = {
  level: number;
  current: number;
  needed: number;
  remaining: number;
  progress: number;
};

// Level N requires N * XP_LEVEL_BASE XP. This is the single level formula
// shared by the web and mobile applications.
export function getXpLevelProgress(totalXp: number): XpLevelProgress {
  const safeXp = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;
  let level = 1;
  let current = safeXp;

  while (current >= level * XP_LEVEL_BASE) {
    current -= level * XP_LEVEL_BASE;
    level += 1;
  }

  const needed = level * XP_LEVEL_BASE;

  return {
    level,
    current,
    needed,
    remaining: needed - current,
    progress: needed > 0 ? current / needed : 0,
  };
}

export function createXpAttemptKey(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export const BRAND = {
  name: "JapanGoLearn",
  siteUrl: "https://japangolearn.com",
  supportEmail: "support@japangolearn.com",
} as const;
