"use server";

import type { CourseLevel, CoursePricingType } from "@japangolearn/database";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTeacherStudio } from "@/lib/marketplace";

function requiredString(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function safeSlug(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) throw new Error("A valid slug is required");
  return slug;
}

async function authenticatedClient() {
  // Every teacher-studio mutation funnels through here, so the flag check sits
  // in one place rather than being repeated in each action.
  requireTeacherStudio();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function saveTeacherProfile(formData: FormData) {
  const { supabase, user } = await authenticatedClient();
  const displayName = requiredString(formData, "displayName");
  const slug = safeSlug(String(formData.get("slug") || displayName));
  const experienceYears = Math.max(0, Number(formData.get("experienceYears") ?? 0));

  const editableValues = {
    slug,
    display_name: displayName,
    bio: String(formData.get("bio") ?? "").trim(),
    qualifications: String(formData.get("qualifications") ?? "").trim(),
    experience_years: Number.isFinite(experienceYears) ? experienceYears : 0,
  };

  // `authenticated` holds UPDATE on the editable columns only, never on user_id, so a
  // PostgREST upsert is rejected at plan time: it puts every payload column, user_id
  // included, into its ON CONFLICT DO UPDATE SET list. Claim the row with a DO NOTHING
  // insert (INSERT privileges only, safe against a concurrent double submit), then
  // update just the columns this role is allowed to write.
  const { error: claimError } = await supabase
    .from("teacher_profiles")
    .upsert(
      { user_id: user.id, ...editableValues },
      { onConflict: "user_id", ignoreDuplicates: true }
    );

  if (claimError) redirect(`/dashboard/teacher?error=${encodeURIComponent(claimError.message)}`);

  const { error } = await supabase
    .from("teacher_profiles")
    .update(editableValues)
    .eq("user_id", user.id);

  if (error) redirect(`/dashboard/teacher?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/teacher");
}

export async function submitTeacherApplication() {
  const { supabase } = await authenticatedClient();
  const { error } = await supabase.rpc("submit_teacher_application");
  if (error) redirect(`/dashboard/teacher?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard/teacher?submitted=1");
}

export async function createCourse(formData: FormData) {
  const { supabase, user } = await authenticatedClient();
  const title = requiredString(formData, "title");
  const pricingType = String(formData.get("pricingType") ?? "free") as CoursePricingType;
  const enteredPrice = Number(formData.get("price") ?? 0);
  const priceMinor = pricingType === "free" ? 0 : Math.round(enteredPrice * 100);

  const { data, error } = await supabase
    .from("courses")
    .insert({
      teacher_id: user.id,
      slug: safeSlug(String(formData.get("slug") || title)),
      title,
      summary: String(formData.get("summary") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      level: String(formData.get("level") ?? "ALL") as CourseLevel,
      pricing_type: pricingType,
      price_minor: priceMinor,
      currency: "INR",
      status: "draft",
    })
    .select("id")
    .single();

  if (error) redirect(`/dashboard/teacher?error=${encodeURIComponent(error.message)}`);
  redirect(`/dashboard/teacher/courses/${data.id}`);
}

export async function addCourseSection(formData: FormData) {
  const { supabase } = await authenticatedClient();
  const courseId = requiredString(formData, "courseId");
  const { data: lastSection } = await supabase
    .from("course_sections")
    .select("position")
    .eq("course_id", courseId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("course_sections").insert({
    course_id: courseId,
    title: requiredString(formData, "title"),
    position: (lastSection?.position ?? -1) + 1,
  });

  if (error) {
    redirect(`/dashboard/teacher/courses/${courseId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function addCourseLesson(formData: FormData) {
  const { supabase } = await authenticatedClient();
  const courseId = requiredString(formData, "courseId");
  const sectionId = requiredString(formData, "sectionId");
  const { data: lastLesson } = await supabase
    .from("course_lessons")
    .select("position")
    .eq("section_id", sectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lessonType = String(formData.get("lessonType") ?? "article") as
    | "video"
    | "article"
    | "quiz"
    | "download";
  const selectedVideoAssetId = String(formData.get("videoAssetId") ?? "").trim();
  const { error } = await supabase.from("course_lessons").insert({
    course_id: courseId,
    section_id: sectionId,
    title: requiredString(formData, "title"),
    summary: String(formData.get("summary") ?? "").trim(),
    lesson_type: selectedVideoAssetId ? "video" : lessonType,
    video_asset_id: selectedVideoAssetId || null,
    content: { body: String(formData.get("body") ?? "").trim() },
    is_preview: formData.get("isPreview") === "on",
    position: (lastLesson?.position ?? -1) + 1,
  });

  if (error) {
    redirect(`/dashboard/teacher/courses/${courseId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}

export async function publishCourse(formData: FormData) {
  const { supabase } = await authenticatedClient();
  const courseId = requiredString(formData, "courseId");
  const { error } = await supabase
    .from("courses")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", courseId);

  if (error) {
    redirect(`/dashboard/teacher/courses/${courseId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/courses");
  revalidatePath(`/dashboard/teacher/courses/${courseId}`);
}
