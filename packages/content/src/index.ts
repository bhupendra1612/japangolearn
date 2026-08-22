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
export { getXpLevelProgress, type XpLevelProgress } from "@japangolearn/core";

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

/**
 * The only level with study content today.
 *
 * Every content query filters on this. It is a constant rather than the
 * learner's chosen level because choosing N2 must not silently serve N5 rows —
 * when a second level ships, these queries move to the profile's level and this
 * constant goes away.
 */
export const CONTENT_JLPT_LEVEL: JlptLevel = "N5";

/**
 * Levels offered when an account is created.
 *
 * Single source of truth for both apps. The database trigger
 * private.handle_new_user() validates these values and falls back to "N5", so
 * anything added here must be one of JLPT_LEVELS.
 *
 * `available` marks the levels a learner can actually study. The rest are shown
 * so the roadmap is visible, but cannot be selected — the app has no content
 * for them, and letting someone pick one would promise a course that does not
 * exist. Flip the flag when that level's content lands.
 */
export const JLPT_SIGNUP_LEVELS = [
  { value: "N5", label: "N5 — Complete Beginner", desc: "I'm just starting", available: true },
  {
    value: "N4",
    label: "N4 — Elementary",
    desc: "I know hiragana & katakana",
    available: false,
  },
  {
    value: "N3",
    label: "N3 — Intermediate",
    desc: "I can have basic conversations",
    available: false,
  },
  { value: "N2", label: "N2 — Upper-Intermediate", desc: "I can read articles", available: false },
  { value: "N1", label: "N1 — Advanced", desc: "I want native-level fluency", available: false },
] as const satisfies readonly {
  value: JlptLevel;
  label: string;
  desc: string;
  available: boolean;
}[];

export type JlptSignupLevel = (typeof JLPT_SIGNUP_LEVELS)[number];

/** Levels a learner can actually choose right now. */
export const AVAILABLE_JLPT_LEVELS = JLPT_SIGNUP_LEVELS.filter((level) => level.available);

export function isJlptLevelAvailable(level: string): boolean {
  return JLPT_SIGNUP_LEVELS.some((entry) => entry.value === level && entry.available);
}

export const DEFAULT_JLPT_LEVEL: JlptLevel = "N5";
