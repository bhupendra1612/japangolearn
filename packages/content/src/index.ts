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
 * Levels offered when an account is created.
 *
 * Single source of truth for both apps. The database trigger
 * private.handle_new_user() validates these values and falls back to "N5", so
 * anything added here must be one of JLPT_LEVELS.
 */
export const JLPT_SIGNUP_LEVELS = [
  { value: "N5", label: "N5 — Complete Beginner", desc: "I'm just starting" },
  { value: "N4", label: "N4 — Elementary", desc: "I know hiragana & katakana" },
  { value: "N3", label: "N3 — Intermediate", desc: "I can have basic conversations" },
  { value: "N2", label: "N2 — Upper-Intermediate", desc: "I can read articles" },
  { value: "N1", label: "N1 — Advanced", desc: "I want native-level fluency" },
] as const satisfies readonly { value: JlptLevel; label: string; desc: string }[];

export type JlptSignupLevel = (typeof JLPT_SIGNUP_LEVELS)[number];

export const DEFAULT_JLPT_LEVEL: JlptLevel = "N5";
