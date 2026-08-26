export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string;
          condition: Json | null;
          description: string | null;
          icon: string;
          id: string;
          name: string;
          xp_reward: number;
        };
        Insert: {
          category?: string;
          condition?: Json | null;
          description?: string | null;
          icon?: string;
          id?: string;
          name: string;
          xp_reward?: number;
        };
        Update: {
          category?: string;
          condition?: Json | null;
          description?: string | null;
          icon?: string;
          id?: string;
          name?: string;
          xp_reward?: number;
        };
        Relationships: [];
      };
      activity_events: {
        Row: {
          attempt_id: string | null;
          event_name: string;
          id: string;
          occurred_at: string;
          properties: Json;
          source: string;
          user_id: string | null;
        };
        Insert: {
          attempt_id?: string | null;
          event_name: string;
          id?: string;
          occurred_at?: string;
          properties?: Json;
          source?: string;
          user_id?: string | null;
        };
        Update: {
          attempt_id?: string | null;
          event_name?: string;
          id?: string;
          occurred_at?: string;
          properties?: Json;
          source?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_events_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "learning_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_log: {
        Row: {
          award_key: string | null;
          created_at: string;
          description: string;
          id: string;
          metadata: Json | null;
          title: string;
          type: string;
          user_id: string;
          xp_earned: number;
        };
        Insert: {
          award_key?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          metadata?: Json | null;
          title: string;
          type: string;
          user_id: string;
          xp_earned?: number;
        };
        Update: {
          award_key?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          metadata?: Json | null;
          title?: string;
          type?: string;
          user_id?: string;
          xp_earned?: number;
        };
        Relationships: [
          {
            foreignKeyName: "activity_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      blog_posts: {
        Row: {
          author_id: string | null;
          content: string;
          cover_image_url: string | null;
          created_at: string;
          excerpt: string | null;
          id: string;
          published: boolean;
          published_at: string | null;
          slug: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          author_id?: string | null;
          content: string;
          cover_image_url?: string | null;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          published?: boolean;
          published_at?: string | null;
          slug: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string | null;
          content?: string;
          cover_image_url?: string | null;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          published?: boolean;
          published_at?: string | null;
          slug?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_submissions: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          read: boolean;
          status: string;
          subject: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
          read?: boolean;
          status?: string;
          subject?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          read?: boolean;
          status?: string;
          subject?: string | null;
        };
        Relationships: [];
      };
      course_categories: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_entitlements: {
        Row: {
          course_id: string;
          created_at: string;
          expires_at: string | null;
          granted_at: string;
          id: string;
          order_id: string | null;
          source: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          expires_at?: string | null;
          granted_at?: string;
          id?: string;
          order_id?: string | null;
          source: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          expires_at?: string | null;
          granted_at?: string;
          id?: string;
          order_id?: string | null;
          source?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_entitlements_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_entitlements_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "course_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_entitlements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      course_lessons: {
        Row: {
          content: Json;
          course_id: string;
          created_at: string;
          duration_seconds: number | null;
          id: string;
          is_preview: boolean;
          lesson_type: string;
          position: number;
          section_id: string;
          summary: string;
          title: string;
          updated_at: string;
          video_asset_id: string | null;
        };
        Insert: {
          content?: Json;
          course_id: string;
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          is_preview?: boolean;
          lesson_type?: string;
          position?: number;
          section_id: string;
          summary?: string;
          title: string;
          updated_at?: string;
          video_asset_id?: string | null;
        };
        Update: {
          content?: Json;
          course_id?: string;
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          is_preview?: boolean;
          lesson_type?: string;
          position?: number;
          section_id?: string;
          summary?: string;
          title?: string;
          updated_at?: string;
          video_asset_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_lessons_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "course_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_lessons_video_asset_id_fkey";
            columns: ["video_asset_id"];
            isOneToOne: false;
            referencedRelation: "video_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      course_orders: {
        Row: {
          amount_minor: number;
          course_id: string;
          created_at: string;
          currency: string;
          id: string;
          idempotency_key: string;
          paid_at: string | null;
          provider: string | null;
          provider_payment_id: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_minor: number;
          course_id: string;
          created_at?: string;
          currency: string;
          id?: string;
          idempotency_key: string;
          paid_at?: string | null;
          provider?: string | null;
          provider_payment_id?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_minor?: number;
          course_id?: string;
          created_at?: string;
          currency?: string;
          id?: string;
          idempotency_key?: string;
          paid_at?: string | null;
          provider?: string | null;
          provider_payment_id?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_orders_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      course_sections: {
        Row: {
          course_id: string;
          created_at: string;
          id: string;
          position: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          id?: string;
          position?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          id?: string;
          position?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_sections_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          category_id: string | null;
          created_at: string;
          currency: string;
          description: string;
          id: string;
          language: string;
          level: string;
          price_minor: number;
          pricing_type: string;
          published_at: string | null;
          slug: string;
          status: string;
          summary: string;
          teacher_id: string;
          thumbnail_url: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          category_id?: string | null;
          created_at?: string;
          currency?: string;
          description?: string;
          id?: string;
          language?: string;
          level?: string;
          price_minor?: number;
          pricing_type?: string;
          published_at?: string | null;
          slug: string;
          status?: string;
          summary?: string;
          teacher_id: string;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          currency?: string;
          description?: string;
          id?: string;
          language?: string;
          level?: string;
          price_minor?: number;
          pricing_type?: string;
          published_at?: string | null;
          slug?: string;
          status?: string;
          summary?: string;
          teacher_id?: string;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "course_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teacher_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      daily_goals: {
        Row: {
          created_at: string;
          date: string;
          grammar_done: number;
          id: string;
          tasks_completed: number;
          tasks_total: number;
          updated_at: string;
          user_id: string;
          vocabulary_done: number;
          writing_done: number;
          xp_earned: number;
          xp_target: number;
        };
        Insert: {
          created_at?: string;
          date?: string;
          grammar_done?: number;
          id?: string;
          tasks_completed?: number;
          tasks_total?: number;
          updated_at?: string;
          user_id: string;
          vocabulary_done?: number;
          writing_done?: number;
          xp_earned?: number;
          xp_target?: number;
        };
        Update: {
          created_at?: string;
          date?: string;
          grammar_done?: number;
          id?: string;
          tasks_completed?: number;
          tasks_total?: number;
          updated_at?: string;
          user_id?: string;
          vocabulary_done?: number;
          writing_done?: number;
          xp_earned?: number;
          xp_target?: number;
        };
        Relationships: [
          {
            foreignKeyName: "daily_goals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      daily_quest_completions: {
        Row: {
          attempt_id: string;
          completed_at: string;
          id: string;
          quest_date: string;
          quest_key: string;
          user_id: string;
        };
        Insert: {
          attempt_id: string;
          completed_at?: string;
          id?: string;
          quest_date?: string;
          quest_key: string;
          user_id: string;
        };
        Update: {
          attempt_id?: string;
          completed_at?: string;
          id?: string;
          quest_date?: string;
          quest_key?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_quest_completions_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "learning_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "daily_quest_completions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      grammar_patterns: {
        Row: {
          category: string;
          created_at: string;
          examples: Json;
          explanation: string;
          id: number;
          jlpt_level: string;
          meaning: string;
          order_index: number;
          pattern: string;
          structure: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          examples?: Json;
          explanation: string;
          id?: number;
          jlpt_level?: string;
          meaning: string;
          order_index?: number;
          pattern?: string;
          structure: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          examples?: Json;
          explanation?: string;
          id?: number;
          jlpt_level?: string;
          meaning?: string;
          order_index?: number;
          pattern?: string;
          structure?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      jlpt_levels: {
        Row: {
          color: string | null;
          created_at: string;
          description: string | null;
          icon_url: string | null;
          id: string;
          level: string;
          name: string;
          order_index: number;
          sort_order: number | null;
          title: string | null;
          total_grammar: number;
          total_kanji: number;
          total_vocabulary: number;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          description?: string | null;
          icon_url?: string | null;
          id: string;
          level: string;
          name: string;
          order_index: number;
          sort_order?: number | null;
          title?: string | null;
          total_grammar?: number;
          total_kanji?: number;
          total_vocabulary?: number;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          description?: string | null;
          icon_url?: string | null;
          id?: string;
          level?: string;
          name?: string;
          order_index?: number;
          sort_order?: number | null;
          title?: string | null;
          total_grammar?: number;
          total_kanji?: number;
          total_vocabulary?: number;
        };
        Relationships: [];
      };
      kana: {
        Row: {
          character: string;
          created_at: string;
          group_name: string;
          icon: string;
          id: number;
          is_combo: boolean;
          is_dakuten: boolean;
          romaji: string;
          romaji_hindi: string;
          sort_order: number;
          stroke_count: number;
          stroke_hint: string;
          type: string;
        };
        Insert: {
          character: string;
          created_at?: string;
          group_name: string;
          icon?: string;
          id?: number;
          is_combo?: boolean;
          is_dakuten?: boolean;
          romaji: string;
          romaji_hindi?: string;
          sort_order?: number;
          stroke_count?: number;
          stroke_hint?: string;
          type: string;
        };
        Update: {
          character?: string;
          created_at?: string;
          group_name?: string;
          icon?: string;
          id?: number;
          is_combo?: boolean;
          is_dakuten?: boolean;
          romaji?: string;
          romaji_hindi?: string;
          sort_order?: number;
          stroke_count?: number;
          stroke_hint?: string;
          type?: string;
        };
        Relationships: [];
      };
      kanji: {
        Row: {
          character: string;
          confusable_kanji: string[];
          created_at: string;
          example_sentences: Json;
          frequency_rank: string | null;
          hindi_pronunciation: string;
          hiragana: string;
          icon: string;
          id: number;
          image_url: string | null;
          jlpt_level: string;
          kunyomi: Json;
          meaning_en: string[];
          meaning_hi: string[];
          mnemonic: string | null;
          onyomi: Json;
          order_index: number;
          radical: string;
          related_kanji: string[];
          romaji: string;
          stroke_count: number;
          tags: string[];
          updated_at: string;
          vocabulary: Json;
          writing_tip: string | null;
        };
        Insert: {
          character: string;
          confusable_kanji?: string[];
          created_at?: string;
          example_sentences?: Json;
          frequency_rank?: string | null;
          hindi_pronunciation?: string;
          hiragana?: string;
          icon?: string;
          id?: number;
          image_url?: string | null;
          jlpt_level?: string;
          kunyomi?: Json;
          meaning_en?: string[];
          meaning_hi?: string[];
          mnemonic?: string | null;
          onyomi?: Json;
          order_index?: number;
          radical?: string;
          related_kanji?: string[];
          romaji?: string;
          stroke_count?: number;
          tags?: string[];
          updated_at?: string;
          vocabulary?: Json;
          writing_tip?: string | null;
        };
        Update: {
          character?: string;
          confusable_kanji?: string[];
          created_at?: string;
          example_sentences?: Json;
          frequency_rank?: string | null;
          hindi_pronunciation?: string;
          hiragana?: string;
          icon?: string;
          id?: number;
          image_url?: string | null;
          jlpt_level?: string;
          kunyomi?: Json;
          meaning_en?: string[];
          meaning_hi?: string[];
          mnemonic?: string | null;
          onyomi?: Json;
          order_index?: number;
          radical?: string;
          related_kanji?: string[];
          romaji?: string;
          stroke_count?: number;
          tags?: string[];
          updated_at?: string;
          vocabulary?: Json;
          writing_tip?: string | null;
        };
        Relationships: [];
      };
      learning_attempt_answers: {
        Row: {
          answer: string | null;
          attempt_id: string;
          correct_answer: string | null;
          created_at: string;
          id: string;
          is_correct: boolean;
          item_id: string;
          item_type: string;
          metadata: Json;
          prompt: string | null;
          response_ms: number | null;
        };
        Insert: {
          answer?: string | null;
          attempt_id: string;
          correct_answer?: string | null;
          created_at?: string;
          id?: string;
          is_correct: boolean;
          item_id: string;
          item_type: string;
          metadata?: Json;
          prompt?: string | null;
          response_ms?: number | null;
        };
        Update: {
          answer?: string | null;
          attempt_id?: string;
          correct_answer?: string | null;
          created_at?: string;
          id?: string;
          is_correct?: boolean;
          item_id?: string;
          item_type?: string;
          metadata?: Json;
          prompt?: string | null;
          response_ms?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "learning_attempt_answers_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "learning_attempts";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_attempts: {
        Row: {
          activity_type: string;
          attempt_key: string;
          completed_at: string | null;
          correct_answers: number;
          created_at: string;
          duration_seconds: number | null;
          id: string;
          metadata: Json;
          score_percent: number | null;
          started_at: string;
          status: string;
          total_questions: number;
          user_id: string;
        };
        Insert: {
          activity_type: string;
          attempt_key: string;
          completed_at?: string | null;
          correct_answers?: number;
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          metadata?: Json;
          score_percent?: number | null;
          started_at?: string;
          status?: string;
          total_questions?: number;
          user_id: string;
        };
        Update: {
          activity_type?: string;
          attempt_key?: string;
          completed_at?: string | null;
          correct_answers?: number;
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          metadata?: Json;
          score_percent?: number | null;
          started_at?: string;
          status?: string;
          total_questions?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_attempts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      marketplace_audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          new_value: Json | null;
          previous_value: Json | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          new_value?: Json | null;
          previous_value?: Json | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          new_value?: Json | null;
          previous_value?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "marketplace_audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      mastery_records: {
        Row: {
          correct_count: number;
          created_at: string;
          id: string;
          incorrect_count: number;
          item_id: string;
          item_type: string;
          last_reviewed_at: string | null;
          mastery_score: number;
          next_review_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          correct_count?: number;
          created_at?: string;
          id?: string;
          incorrect_count?: number;
          item_id: string;
          item_type: string;
          last_reviewed_at?: string | null;
          mastery_score?: number;
          next_review_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          correct_count?: number;
          created_at?: string;
          id?: string;
          incorrect_count?: number;
          item_id?: string;
          item_type?: string;
          last_reviewed_at?: string | null;
          mastery_score?: number;
          next_review_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mastery_records_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      practice_list_items: {
        Row: {
          created_at: string;
          id: string;
          item_id: number;
          item_type: string;
          last_reviewed: string | null;
          list_id: string;
          mastery_score: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_id: number;
          item_type: string;
          last_reviewed?: string | null;
          list_id: string;
          mastery_score?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: number;
          item_type?: string;
          last_reviewed?: string | null;
          list_id?: string;
          mastery_score?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "practice_list_items_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "practice_lists";
            referencedColumns: ["id"];
          },
        ];
      };
      practice_lists: {
        Row: {
          created_at: string;
          id: string;
          is_smart_list: boolean;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_smart_list?: boolean;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_smart_list?: boolean;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "practice_lists_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          current_jlpt_level: string;
          daily_xp_goal: number;
          display_name: string | null;
          id: string;
          last_active_at: string | null;
          notifications_seen_at: string | null;
          onboarding_completed: boolean;
          role: string;
          streak_days: number;
          streak_freezes: number;
          updated_at: string;
          xp: number;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          current_jlpt_level?: string;
          daily_xp_goal?: number;
          display_name?: string | null;
          id: string;
          last_active_at?: string | null;
          notifications_seen_at?: string | null;
          onboarding_completed?: boolean;
          role?: string;
          streak_days?: number;
          streak_freezes?: number;
          updated_at?: string;
          xp?: number;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          current_jlpt_level?: string;
          daily_xp_goal?: number;
          display_name?: string | null;
          id?: string;
          last_active_at?: string | null;
          notifications_seen_at?: string | null;
          onboarding_completed?: boolean;
          role?: string;
          streak_days?: number;
          streak_freezes?: number;
          updated_at?: string;
          xp?: number;
        };
        Relationships: [];
      };
      teacher_profiles: {
        Row: {
          bio: string;
          created_at: string;
          display_name: string;
          experience_years: number;
          qualifications: string;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          slug: string;
          status: string;
          submitted_at: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          bio?: string;
          created_at?: string;
          display_name: string;
          experience_years?: number;
          qualifications?: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug: string;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          bio?: string;
          created_at?: string;
          display_name?: string;
          experience_years?: number;
          qualifications?: string;
          review_notes?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          slug?: string;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teacher_profiles_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teacher_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_achievements: {
        Row: {
          achievement_id: string;
          id: string;
          unlocked_at: string;
          user_id: string;
        };
        Insert: {
          achievement_id: string;
          id?: string;
          unlocked_at?: string;
          user_id: string;
        };
        Update: {
          achievement_id?: string;
          id?: string;
          unlocked_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_kana_progress: {
        Row: {
          correct_count: number | null;
          created_at: string;
          id: string;
          incorrect_count: number | null;
          kana_id: number;
          last_practiced_at: string | null;
          last_reviewed: string | null;
          mastery: number | null;
          mastery_score: number;
          times_practiced: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          correct_count?: number | null;
          created_at?: string;
          id?: string;
          incorrect_count?: number | null;
          kana_id: number;
          last_practiced_at?: string | null;
          last_reviewed?: string | null;
          mastery?: number | null;
          mastery_score?: number;
          times_practiced?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          correct_count?: number | null;
          created_at?: string;
          id?: string;
          incorrect_count?: number | null;
          kana_id?: number;
          last_practiced_at?: string | null;
          last_reviewed?: string | null;
          mastery?: number | null;
          mastery_score?: number;
          times_practiced?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_kana_progress_kana_id_fkey";
            columns: ["kana_id"];
            isOneToOne: false;
            referencedRelation: "kana";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_kana_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_kanji_progress: {
        Row: {
          correct_count: number | null;
          created_at: string;
          id: string;
          incorrect_count: number | null;
          kanji_id: number;
          last_practiced_at: string | null;
          last_reviewed: string | null;
          mastery: number | null;
          mastery_score: number;
          times_practiced: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          correct_count?: number | null;
          created_at?: string;
          id?: string;
          incorrect_count?: number | null;
          kanji_id: number;
          last_practiced_at?: string | null;
          last_reviewed?: string | null;
          mastery?: number | null;
          mastery_score?: number;
          times_practiced?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          correct_count?: number | null;
          created_at?: string;
          id?: string;
          incorrect_count?: number | null;
          kanji_id?: number;
          last_practiced_at?: string | null;
          last_reviewed?: string | null;
          mastery?: number | null;
          mastery_score?: number;
          times_practiced?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_kanji_progress_kanji_id_fkey";
            columns: ["kanji_id"];
            isOneToOne: false;
            referencedRelation: "kanji";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_kanji_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_level_progress: {
        Row: {
          completed_at: string | null;
          id: string;
          jlpt_level: string;
          progress_percent: number;
          started_at: string | null;
          unlocked_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          id?: string;
          jlpt_level: string;
          progress_percent?: number;
          started_at?: string | null;
          unlocked_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          id?: string;
          jlpt_level?: string;
          progress_percent?: number;
          started_at?: string | null;
          unlocked_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_level_progress_jlpt_level_fkey";
            columns: ["jlpt_level"];
            isOneToOne: false;
            referencedRelation: "jlpt_levels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_level_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          granted_at: string;
          granted_by: string | null;
          role: string;
          user_id: string;
        };
        Insert: {
          granted_at?: string;
          granted_by?: string | null;
          role: string;
          user_id: string;
        };
        Update: {
          granted_at?: string;
          granted_by?: string | null;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_streaks: {
        Row: {
          current_streak: number;
          last_practice_date: string | null;
          longest_streak: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          current_streak?: number;
          last_practice_date?: string | null;
          longest_streak?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          current_streak?: number;
          last_practice_date?: string | null;
          longest_streak?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_streaks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      video_assets: {
        Row: {
          bunny_video_id: string | null;
          course_id: string | null;
          created_at: string;
          duration_seconds: number | null;
          error_message: string | null;
          file_name: string | null;
          id: string;
          status: string;
          teacher_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          bunny_video_id?: string | null;
          course_id?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          error_message?: string | null;
          file_name?: string | null;
          id?: string;
          status?: string;
          teacher_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          bunny_video_id?: string | null;
          course_id?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          error_message?: string | null;
          file_name?: string | null;
          id?: string;
          status?: string;
          teacher_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "video_assets_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_assets_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "teacher_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
      vocabulary: {
        Row: {
          created_at: string;
          english: string;
          hiragana: string;
          icon: string | null;
          id: number;
          jlpt_level: string;
          kanji: string;
          romaji: string;
          romaji_hindi: string;
          topic: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          english: string;
          hiragana: string;
          icon?: string | null;
          id?: number;
          jlpt_level?: string;
          kanji: string;
          romaji: string;
          romaji_hindi?: string;
          topic: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          english?: string;
          hiragana?: string;
          icon?: string | null;
          id?: number;
          jlpt_level?: string;
          kanji?: string;
          romaji?: string;
          romaji_hindi?: string;
          topic?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      xp_ledger: {
        Row: {
          amount: number;
          attempt_id: string | null;
          award_key: string;
          created_at: string;
          id: string;
          reason: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          attempt_id?: string | null;
          award_key: string;
          created_at?: string;
          id?: string;
          reason: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          attempt_id?: string | null;
          award_key?: string;
          created_at?: string;
          id?: string;
          reason?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "xp_ledger_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "learning_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "xp_ledger_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      award_xp: {
        Args: {
          p_activity_type: string;
          p_answers?: Json;
          p_attempt_key: string;
          p_correct_answers: number;
          p_total_questions: number;
        };
        Returns: {
          attempt_id: string;
          total_xp: number;
          unlocked_ids: string[];
          was_duplicate: boolean;
          xp_awarded: number;
        }[];
      };
      create_course_order: {
        Args: { request_idempotency_key: string; target_course_id: string };
        Returns: {
          amount_minor: number;
          course_id: string;
          created_at: string;
          currency: string;
          id: string;
          idempotency_key: string;
          paid_at: string | null;
          provider: string | null;
          provider_payment_id: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "course_orders";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      delete_account: { Args: never; Returns: undefined };
      enroll_free_course: {
        Args: { target_course_id: string };
        Returns: {
          course_id: string;
          created_at: string;
          expires_at: string | null;
          granted_at: string;
          id: string;
          order_id: string | null;
          source: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "course_entitlements";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      fulfill_course_order: {
        Args: {
          payment_id: string;
          payment_provider: string;
          target_order_id: string;
        };
        Returns: {
          course_id: string;
          created_at: string;
          expires_at: string | null;
          granted_at: string;
          id: string;
          order_id: string | null;
          source: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "course_entitlements";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      get_due_reviews: {
        Args: { p_limit?: number };
        Returns: {
          answer: string;
          item_id: string;
          item_type: string;
          mastery_score: number;
          next_review_at: string;
          prompt: string;
          reading: string;
        }[];
      };
      get_kanji_of_the_day: {
        Args: { p_level?: string };
        Returns: {
          glyph: string;
          jlpt_level: string;
          kanji_id: number;
          meanings: string[];
          reading_kun: Json;
          reading_on: Json;
          romaji: string;
          stroke_count: number;
        }[];
      };
      get_notifications: {
        Args: { p_limit?: number };
        Returns: {
          body: string;
          href: string;
          kind: string;
          occurred_at: string;
          title: string;
        }[];
      };
      get_resume_point: {
        Args: never;
        Returns: {
          activity_type: string;
          correct_answers: number;
          last_at: string;
          total_questions: number;
        }[];
      };
      get_review_summary: {
        Args: never;
        Returns: {
          due_now: number;
          due_today: number;
          mastered_items: number;
          tracked_items: number;
          weak_items: number;
        }[];
      };
      get_skill_breakdown: {
        Args: never;
        Returns: {
          accuracy: number;
          avg_mastery: number;
          item_type: string;
          mastered: number;
          tracked: number;
        }[];
      };
      increment_streak: { Args: never; Returns: undefined };
      mark_notifications_seen: { Args: never; Returns: string };
      review_teacher_application: {
        Args: { decision: string; notes?: string; target_user_id: string };
        Returns: {
          bio: string;
          created_at: string;
          display_name: string;
          experience_years: number;
          qualifications: string;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          slug: string;
          status: string;
          submitted_at: string | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "teacher_profiles";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      search_curriculum: {
        Args: { p_limit?: number; p_query: string };
        Returns: {
          item_id: number;
          item_type: string;
          jlpt_level: string;
          meaning: string;
          rank: number;
          subtitle: string;
          title: string;
        }[];
      };
      set_daily_xp_goal: { Args: { p_goal: number }; Returns: number };
      submit_teacher_application: {
        Args: never;
        Returns: {
          bio: string;
          created_at: string;
          display_name: string;
          experience_years: number;
          qualifications: string;
          review_notes: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          slug: string;
          status: string;
          submitted_at: string | null;
          updated_at: string;
          user_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "teacher_profiles";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      track_analytics_event: {
        Args: { p_event_name: string; p_properties?: Json; p_source?: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
