import type { Database as GeneratedDatabase, Json } from "./supabase.types";

export type MarketplaceRole =
  | "student"
  | "teacher"
  | "admin"
  | "support"
  | "finance"
  | "content_reviewer";

export type TeacherStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "suspended";

export type CourseStatus = "draft" | "published" | "archived";
export type CoursePricingType = "free" | "paid";
export type CourseLevel = "N5" | "N4" | "N3" | "N2" | "N1" | "ALL";

export type UserRoleRow = {
  user_id: string;
  role: MarketplaceRole;
  granted_by: string | null;
  granted_at: string;
};

export type TeacherProfileRow = {
  user_id: string;
  slug: string;
  display_name: string;
  bio: string;
  qualifications: string;
  experience_years: number;
  status: TeacherStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseCategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CourseRow = {
  id: string;
  teacher_id: string;
  category_id: string | null;
  slug: string;
  title: string;
  summary: string;
  description: string;
  level: CourseLevel;
  language: "en" | "hi" | "ja";
  pricing_type: CoursePricingType;
  price_minor: number;
  currency: string;
  status: CourseStatus;
  thumbnail_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseSectionRow = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type VideoAssetRow = {
  id: string;
  teacher_id: string;
  course_id: string | null;
  bunny_video_id: string | null;
  title: string;
  file_name: string | null;
  status: "created" | "uploading" | "processing" | "ready" | "failed";
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseLessonRow = {
  id: string;
  course_id: string;
  section_id: string;
  video_asset_id: string | null;
  title: string;
  summary: string;
  lesson_type: "video" | "article" | "quiz" | "download";
  content: Json;
  is_preview: boolean;
  position: number;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
};

export type CourseOrderRow = {
  id: string;
  user_id: string;
  course_id: string;
  amount_minor: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  provider: string | null;
  provider_payment_id: string | null;
  idempotency_key: string;
  created_at: string;
  paid_at: string | null;
  updated_at: string;
};

export type CourseEntitlementRow = {
  id: string;
  user_id: string;
  course_id: string;
  order_id: string | null;
  source: "free" | "purchase" | "admin";
  status: "active" | "revoked" | "expired";
  granted_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type TableDefinition<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type MarketplaceTables = {
  user_roles: TableDefinition<
    UserRoleRow,
    {
      user_id: string;
      role: MarketplaceRole;
      granted_by?: string | null;
      granted_at?: string;
    }
  >;
  teacher_profiles: TableDefinition<
    TeacherProfileRow,
    {
      user_id: string;
      slug: string;
      display_name: string;
      bio?: string;
      qualifications?: string;
      experience_years?: number;
      status?: TeacherStatus;
      submitted_at?: string | null;
      reviewed_at?: string | null;
      reviewed_by?: string | null;
      review_notes?: string | null;
      created_at?: string;
      updated_at?: string;
    }
  >;
  course_categories: TableDefinition<
    CourseCategoryRow,
    {
      id?: string;
      slug: string;
      name: string;
      description?: string;
      sort_order?: number;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    }
  >;
  courses: TableDefinition<
    CourseRow,
    {
      id?: string;
      teacher_id: string;
      category_id?: string | null;
      slug: string;
      title: string;
      summary?: string;
      description?: string;
      level?: CourseLevel;
      language?: "en" | "hi" | "ja";
      pricing_type?: CoursePricingType;
      price_minor?: number;
      currency?: string;
      status?: CourseStatus;
      thumbnail_url?: string | null;
      published_at?: string | null;
      created_at?: string;
      updated_at?: string;
    }
  >;
  course_sections: TableDefinition<
    CourseSectionRow,
    {
      id?: string;
      course_id: string;
      title: string;
      position?: number;
      created_at?: string;
      updated_at?: string;
    }
  >;
  video_assets: TableDefinition<
    VideoAssetRow,
    {
      id?: string;
      teacher_id: string;
      course_id?: string | null;
      bunny_video_id?: string | null;
      title: string;
      file_name?: string | null;
      status?: VideoAssetRow["status"];
      duration_seconds?: number | null;
      error_message?: string | null;
      created_at?: string;
      updated_at?: string;
    }
  >;
  course_lessons: TableDefinition<
    CourseLessonRow,
    {
      id?: string;
      course_id: string;
      section_id: string;
      video_asset_id?: string | null;
      title: string;
      summary?: string;
      lesson_type?: CourseLessonRow["lesson_type"];
      content?: Json;
      is_preview?: boolean;
      position?: number;
      duration_seconds?: number | null;
      created_at?: string;
      updated_at?: string;
    }
  >;
  course_orders: TableDefinition<
    CourseOrderRow,
    {
      id?: string;
      user_id: string;
      course_id: string;
      amount_minor: number;
      currency: string;
      status?: CourseOrderRow["status"];
      provider?: string | null;
      provider_payment_id?: string | null;
      idempotency_key: string;
      created_at?: string;
      paid_at?: string | null;
      updated_at?: string;
    }
  >;
  course_entitlements: TableDefinition<
    CourseEntitlementRow,
    {
      id?: string;
      user_id: string;
      course_id: string;
      order_id?: string | null;
      source: CourseEntitlementRow["source"];
      status?: CourseEntitlementRow["status"];
      granted_at?: string;
      expires_at?: string | null;
      created_at?: string;
      updated_at?: string;
    }
  >;
};

type MarketplaceFunctions = {
  submit_teacher_application: {
    Args: never;
    Returns: TeacherProfileRow;
  };
  review_teacher_application: {
    Args: { target_user_id: string; decision: string; notes?: string | null };
    Returns: TeacherProfileRow;
  };
  enroll_free_course: {
    Args: { target_course_id: string };
    Returns: CourseEntitlementRow;
  };
  create_course_order: {
    Args: { target_course_id: string; request_idempotency_key: string };
    Returns: CourseOrderRow;
  };
  fulfill_course_order: {
    Args: { target_order_id: string; payment_provider: string; payment_id: string };
    Returns: CourseEntitlementRow;
  };
};

export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Tables" | "Functions"> & {
    Tables: GeneratedDatabase["public"]["Tables"] & MarketplaceTables;
    Functions: GeneratedDatabase["public"]["Functions"] & MarketplaceFunctions;
  };
};
