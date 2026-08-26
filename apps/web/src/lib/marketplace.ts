import { notFound } from "next/navigation";
import { featureFlags } from "@/lib/feature-flags";

/**
 * The teacher marketplace — public catalogue, enrolment, purchases, and the
 * teacher studio — is deferred past the first release. JapanGoLearn v1 ships as
 * a free JLPT self-study product on web and mobile.
 *
 * The implementation stays in the repository behind these flags rather than
 * being deleted, so re-enabling it is a configuration change. Set
 * NEXT_PUBLIC_FEATURE_COURSE_CATALOG / NEXT_PUBLIC_FEATURE_TEACHER_STUDIO to "1"
 * to bring it back.
 *
 * Before re-enabling, the marketplace RLS defects recorded in
 * docs/saas-phase-progress.md must be fixed — they are dormant only because no
 * course rows exist.
 */
export const courseCatalogEnabled = featureFlags.courseCatalog;
export const teacherStudioEnabled = featureFlags.teacherStudio;

/**
 * Guards a route or server action. Hiding a page does not disable the server
 * actions defined alongside it — those stay callable by anyone who can craft the
 * request — so every marketplace mutation calls this too, not just the pages.
 */
export function requireCourseCatalog() {
  if (!courseCatalogEnabled) notFound();
}

export function requireTeacherStudio() {
  if (!teacherStudioEnabled) notFound();
}
