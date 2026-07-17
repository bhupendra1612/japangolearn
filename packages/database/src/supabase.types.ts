export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableDefinition<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<{
        id: string;
        display_name: string | null;
        avatar_url: string | null;
        current_jlpt_level: string;
        xp: number;
        streak_days: number;
        onboarding_completed: boolean;
        role: string;
        created_at: string | null;
        updated_at: string | null;
        last_active_at: string | null;
      }>;
      jlpt_levels: TableDefinition<{
        id: string;
        level: string;
        name: string;
        title: string | null;
        description: string | null;
        order_index: number;
        sort_order: number | null;
        total_kanji: number;
        total_vocabulary: number;
        total_grammar: number;
        color: string | null;
        icon_url: string | null;
        created_at: string | null;
      }>;
      user_level_progress: TableDefinition<{
        id: string;
        user_id: string;
        jlpt_level: string;
        progress_percent: number | null;
        unlocked_at: string | null;
        completed_at: string | null;
      }>;
      blog_posts: TableDefinition<{
        id: string;
        title: string;
        slug: string;
        excerpt: string | null;
        content: string | null;
        status: string | null;
        published_at: string | null;
        created_at: string | null;
        updated_at: string | null;
      }>;
      contact_submissions: TableDefinition<{
        id: string;
        name: string | null;
        email: string | null;
        subject: string | null;
        message: string | null;
        status: string | null;
        created_at: string | null;
      }>;
      daily_goals: TableDefinition<{
        id: string;
        user_id: string;
        date: string;
        xp_earned: number;
        xp_target: number;
        tasks_completed: number;
        tasks_total: number;
        vocabulary_done: number | null;
        grammar_done: number | null;
        writing_done: number | null;
        created_at: string | null;
        updated_at: string | null;
      }>;
      activity_log: TableDefinition<
        {
          id: string;
          user_id: string;
          type:
            | "lesson"
            | "kanji"
            | "xp"
            | "streak"
            | "achievement"
            | "vocabulary"
            | "grammar"
            | "listening";
          title: string;
          description: string;
          xp_earned: number;
          metadata: Json | null;
          award_key: string | null;
          created_at: string;
        },
        Record<string, unknown>
      >;
      achievements: TableDefinition<{
        id: string;
        name: string;
        description: string | null;
        icon: string;
        xp_reward: number | null;
        category: string;
        condition: Json | null;
      }>;
      user_achievements: TableDefinition<{
        id: string;
        user_id: string | null;
        achievement_id: string | null;
        unlocked_at: string | null;
      }>;
      vocabulary: TableDefinition<{
        id: number;
        kanji: string;
        hiragana: string;
        romaji: string;
        romaji_hindi: string;
        english: string;
        topic: string;
        jlpt_level: string;
        icon: string | null;
        created_at: string | null;
        updated_at: string | null;
      }>;
      kana: TableDefinition<{
        id: number;
        character: string;
        romaji: string;
        romaji_hindi: string;
        icon: string;
        type: string;
        group_name: string;
        stroke_count: number;
        stroke_hint: string;
        sort_order: number;
        is_dakuten: boolean;
        is_combo: boolean;
        created_at: string | null;
      }>;
      user_kana_progress: TableDefinition<{
        id: string;
        user_id: string;
        kana_id: number;
        mastery_score: number | null;
        last_reviewed: string | null;
        created_at: string | null;
        updated_at: string | null;
      }>;
      grammar_patterns: TableDefinition<{
        id: number;
        title: string;
        pattern: string;
        structure: string;
        meaning: string;
        explanation: string;
        examples: any[];
        jlpt_level: string;
        category: string;
        order_index: number;
        created_at: string | null;
        updated_at: string | null;
      }>;
      practice_lists: TableDefinition<{
        id: string;
        user_id: string;
        title: string;
        is_smart_list: boolean;
        created_at: string;
        updated_at: string | null;
      }>;
      practice_list_items: TableDefinition<{
        id: string;
        list_id: string;
        item_id: number;
        item_type: "vocabulary" | "kana";
        mastery_score: number;
        last_reviewed: string | null;
        created_at: string;
        updated_at: string | null;
      }>;
      user_streaks: TableDefinition<{
        id: string;
        user_id: string;
        current_streak: number;
        longest_streak: number;
        last_practice_date: string | null;
        created_at: string | null;
        updated_at: string | null;
      }>;
      kanji: TableDefinition<{
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
        jlpt_level: string;
        order_index: number;
        frequency_rank: string | null;
        mnemonic: string | null;
        writing_tip: string | null;
        kunyomi: { reading: string; romaji: string; hindi: string }[];
        onyomi: { reading: string; romaji: string; hindi: string }[];
        vocabulary: {
          word: string;
          hiragana: string;
          romaji: string;
          hindi_pronunciation: string;
          hindi: string;
          english: string;
        }[];
        example_sentences: {
          jp: string;
          hiragana: string;
          romaji: string;
          hindi_pronunciation: string;
          hindi: string;
          english: string;
        }[];
        related_kanji: string[];
        confusable_kanji: string[];
        image_url: string | null;
        tags: string[];
        created_at: string | null;
        updated_at: string | null;
      }>;
      user_kanji_progress: TableDefinition<{
        id: string;
        user_id: string;
        kanji_id: number;
        mastery_score: number | null;
        last_reviewed: string | null;
        created_at: string | null;
        updated_at: string | null;
      }>;
      learning_attempts: TableDefinition<{
        id: string;
        user_id: string;
        activity_type: "vocabulary_quiz" | "grammar_quiz" | "writing_quiz" | "practice_quiz";
        status: "started" | "completed" | "abandoned";
        correct_answers: number;
        total_questions: number;
        score_percent: number;
        duration_seconds: number | null;
        attempt_key: string;
        started_at: string;
        completed_at: string | null;
        metadata: Json;
        created_at: string;
      }>;
      learning_attempt_answers: TableDefinition<{
        id: string;
        attempt_id: string;
        item_type: "vocabulary" | "kana" | "kanji" | "grammar";
        item_id: string;
        prompt: string | null;
        answer: string | null;
        correct_answer: string | null;
        is_correct: boolean;
        response_ms: number | null;
        metadata: Json;
        created_at: string;
      }>;
      activity_events: TableDefinition<{
        id: string;
        user_id: string | null;
        attempt_id: string | null;
        event_name: string;
        source: "web" | "mobile" | "admin" | "server" | "migration";
        properties: Json;
        occurred_at: string;
      }>;
      xp_ledger: TableDefinition<{
        id: string;
        user_id: string;
        attempt_id: string | null;
        amount: number;
        reason: string;
        award_key: string;
        created_at: string;
      }>;
      mastery_records: TableDefinition<{
        id: string;
        user_id: string;
        item_type: "vocabulary" | "kana" | "kanji" | "grammar";
        item_id: string;
        mastery_score: number;
        correct_count: number;
        incorrect_count: number;
        last_reviewed_at: string | null;
        next_review_at: string | null;
        created_at: string;
        updated_at: string;
      }>;
      daily_quest_completions: TableDefinition<{
        id: string;
        user_id: string;
        quest_key: "vocabulary" | "grammar" | "kanji";
        quest_date: string;
        attempt_id: string;
        completed_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      increment_streak: {
        Args: Record<PropertyKey, never>;
        Returns: null;
      };
      award_xp: {
        Args: {
          p_activity_type: string;
          p_correct_answers: number;
          p_total_questions: number;
          p_attempt_key: string;
        };
        Returns: {
          attempt_id: string;
          xp_awarded: number;
          total_xp: number;
          was_duplicate: boolean;
          unlocked_ids: string[];
        }[];
      };
      track_analytics_event: {
        Args: {
          p_event_name: string;
          p_properties: Json;
          p_source: string;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: {
      achievement_unlock_result: {
        unlocked_id: string;
      };
    };
  };
};
