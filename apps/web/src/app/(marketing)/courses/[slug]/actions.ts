"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCourseCatalog } from "@/lib/marketplace";

export async function enrollFreeCourse(formData: FormData) {
  requireCourseCatalog();

  const courseId = String(formData.get("courseId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent(`/courses/${slug}`)}`);

  const { error } = await supabase.rpc("enroll_free_course", {
    target_course_id: courseId,
  });

  if (error) redirect(`/courses/${slug}?message=${encodeURIComponent(error.message)}`);
  redirect(`/courses/${slug}?enrolled=1`);
}

export async function startPaidOrder(formData: FormData) {
  requireCourseCatalog();

  const courseId = String(formData.get("courseId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent(`/courses/${slug}`)}`);

  const { data, error } = await supabase.rpc("create_course_order", {
    target_course_id: courseId,
    request_idempotency_key: `${user.id}:${courseId}:${randomUUID()}`,
  });

  if (error) redirect(`/courses/${slug}?message=${encodeURIComponent(error.message)}`);
  redirect(`/courses/${slug}?checkout=pending&order=${data.id}`);
}
