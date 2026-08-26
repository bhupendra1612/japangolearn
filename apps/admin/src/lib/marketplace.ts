import { notFound } from "next/navigation";

/**
 * Teacher review is part of the marketplace, which is deferred past v1. Kept in
 * the codebase behind this flag rather than deleted — set
 * NEXT_PUBLIC_FEATURE_TEACHER_ONBOARDING to "1" to restore it.
 */
export const teacherReviewEnabled =
  process.env.NEXT_PUBLIC_FEATURE_TEACHER_ONBOARDING === "1" ||
  process.env.NEXT_PUBLIC_FEATURE_TEACHER_ONBOARDING?.toLowerCase() === "true";

/** Guards both the page and the review server action behind it. */
export function requireTeacherReview() {
  if (!teacherReviewEnabled) notFound();
}
