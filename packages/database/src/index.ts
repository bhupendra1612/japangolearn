export const SUPABASE_PROJECT_REF = "teylstfbjtutssnfmhhu";

export const SUPABASE_PROJECT_URL = "https://teylstfbjtutssnfmhhu.supabase.co";

export const DATABASE_TABLES = [
  "profiles",
  "jlpt_levels",
  "user_level_progress",
  "blog_posts",
  "contact_submissions",
  "daily_goals",
  "activity_log",
  "achievements",
  "user_achievements",
  "vocabulary",
  "kana",
  "user_kana_progress",
  "grammar_patterns",
  "practice_lists",
  "practice_list_items",
  "user_streaks",
  "kanji",
  "user_kanji_progress",
] as const;

export type DatabaseTable = (typeof DATABASE_TABLES)[number];

export type { Database, Json } from "./supabase.types";

export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

export type UserRole = "student" | "admin" | string;

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  current_jlpt_level: JlptLevel | string;
  xp: number;
  streak_days: number;
  onboarding_completed: boolean;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
};

export type ProfileUpdate = {
  display_name?: string;
  avatar_url?: string | null;
  current_jlpt_level?: JlptLevel | string;
};

export type Kana = {
  id: number;
  character: string;
  romaji: string;
  romaji_hindi: string | null;
  type: "hiragana" | "katakana" | string;
  group_name: string;
  stroke_count: number;
  stroke_hint: string | null;
  sort_order: number;
  is_dakuten: boolean;
  is_combo: boolean;
};

export type VocabularyWord = {
  id: number;
  kanji: string | null;
  hiragana: string;
  romaji: string;
  romaji_hindi: string | null;
  english: string;
  topic: string;
  jlpt_level: JlptLevel | string;
  icon: string | null;
};

export type KanjiKunReading = {
  reading: string;
  romaji: string;
  hindi: string;
};

export type KanjiOnReading = {
  reading: string;
  romaji: string;
  hindi: string;
};

export type KanjiVocabularyItem = {
  word: string;
  hiragana: string;
  romaji: string;
  hindi_pronunciation: string;
  hindi: string;
  english: string;
};

export type KanjiExampleSentence = {
  jp: string;
  hiragana: string;
  romaji: string;
  hindi_pronunciation: string;
  hindi: string;
  english: string;
};

export type Kanji = {
  id: number;
  character: string;
  icon: string;
  hiragana: string;
  romaji: string;
  hindi_pronunciation: string;
  meaning_en: string[];
  meaning_hi: string[];
  stroke_count: number;
  radical: string;
  jlpt_level: JlptLevel | string;
  order_index: number;
  frequency_rank: string | null;
  mnemonic: string | null;
  writing_tip: string | null;
  kunyomi: KanjiKunReading[];
  onyomi: KanjiOnReading[];
  vocabulary: KanjiVocabularyItem[];
  example_sentences: KanjiExampleSentence[];
  related_kanji: string[];
  confusable_kanji: string[];
  tags: string[];
};

export type PracticeList = {
  id: string;
  user_id?: string;
  title: string;
  is_smart_list: boolean;
  created_at?: string;
  item_count?: number;
};

export type PracticeItemType = "vocabulary" | "kana";

export type PracticeListItem = {
  id: string;
  list_id: string;
  item_id: number;
  item_type: PracticeItemType;
  created_at?: string;
};

export type UserStreak = {
  id?: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_practiced_date?: string | null;
};

export type DailyGoal = {
  id?: string;
  user_id: string;
  date: string;
  vocabulary_done?: number;
  grammar_done?: number;
  writing_done?: number;
  created_at?: string;
};

export type ActivityLog = {
  id: string;
  user_id: string;
  type?: string;
  description?: string | null;
  xp_earned?: number;
  metadata?: Record<string, unknown> | null;
  award_key?: string | null;
  created_at: string;
};

export type Achievement = {
  id: string;
  name: string;
  description?: string | null;
  icon: string;
  xp_reward?: number | null;
  category: string;
};

export type UserAchievement = {
  id: string;
  user_id: string | null;
  achievement_id: string | null;
  unlocked_at?: string | null;
};
