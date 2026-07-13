export type AdminSectionKey =
  | "users"
  | "vocabulary"
  | "kana"
  | "kanji"
  | "grammar"
  | "blog"
  | "contacts";

export type AdminSection = {
  key: AdminSectionKey;
  label: string;
  table: string;
  description: string;
  fields: string[];
};

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    key: "users",
    label: "Users",
    table: "profiles",
    description: "Accounts, roles, levels, XP, streaks, and onboarding state.",
    fields: [
      "display_name",
      "role",
      "current_jlpt_level",
      "xp",
      "streak_days",
      "onboarding_completed",
      "created_at",
    ],
  },
  {
    key: "vocabulary",
    label: "Vocabulary",
    table: "vocabulary",
    description: "Words, readings, topics, meanings, icons, and JLPT levels.",
    fields: ["kanji", "hiragana", "romaji", "english", "topic", "jlpt_level"],
  },
  {
    key: "kana",
    label: "Kana",
    table: "kana",
    description: "Hiragana and katakana characters with stroke metadata.",
    fields: ["character", "romaji", "type", "group_name", "stroke_count", "sort_order"],
  },
  {
    key: "kanji",
    label: "Kanji",
    table: "kanji",
    description: "Kanji cards, readings, meanings, tags, examples, and writing tips.",
    fields: [
      "character",
      "meaning_en",
      "jlpt_level",
      "stroke_count",
      "radical",
      "order_index",
      "tags",
    ],
  },
  {
    key: "grammar",
    label: "Grammar",
    table: "grammar_patterns",
    description: "Grammar patterns, structures, examples, and JLPT levels.",
    fields: ["title", "pattern", "structure", "meaning", "jlpt_level", "created_at"],
  },
  {
    key: "blog",
    label: "Blog",
    table: "blog_posts",
    description: "Marketing and learning articles for the public website.",
    fields: ["title", "slug", "status", "published_at", "created_at"],
  },
  {
    key: "contacts",
    label: "Contact Submissions",
    table: "contact_submissions",
    description: "Inbound messages submitted from the public contact page.",
    fields: ["name", "email", "subject", "message", "status", "created_at"],
  },
];

export function getAdminSection(key: string) {
  return ADMIN_SECTIONS.find((section) => section.key === key);
}
