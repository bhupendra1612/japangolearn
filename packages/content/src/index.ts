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

export const BRAND = {
  name: "JapanGoLearn",
  siteUrl: "https://japangolearn.com",
  supportEmail: "support@japangolearn.com",
} as const;
