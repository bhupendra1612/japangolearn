import type { Metadata } from "next";
import { ArrowLeft, BookOpen, CheckCircle2, Clock3, LockKeyhole, PlayCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import { courseCatalogEnabled, requireCourseCatalog } from "@/lib/marketplace";
import { enrollFreeCourse, startPaidOrder } from "./actions";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (!courseCatalogEnabled) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }

  const { slug } = await params;
  const canonical = `https://japangolearn.com/courses/${slug}`;

  const supabase = createStaticClient();
  const { data: course } = await supabase
    .from("courses")
    .select("title, summary, description")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  // An unpublished or missing course renders a 404, so keep it out of the index.
  if (!course) {
    return { title: "Course not found", robots: { index: false, follow: false } };
  }

  const description =
    course.summary?.trim() ||
    course.description?.trim().slice(0, 160) ||
    `Learn Japanese with ${course.title} on JapanGoLearn.`;

  return {
    title: course.title,
    description,
    alternates: { canonical },
    openGraph: { title: course.title, description, url: canonical, type: "article" },
  };
}

export default async function CourseDetailPage({ params, searchParams }: PageProps) {
  requireCourseCatalog();

  const { slug } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!course) notFound();

  const [{ data: teacher }, { data: sections }, { data: lessons }, entitlementResult] =
    await Promise.all([
      supabase
        .from("teacher_profiles")
        .select("display_name, bio, slug")
        .eq("user_id", course.teacher_id)
        .maybeSingle(),
      supabase.from("course_sections").select("*").eq("course_id", course.id).order("position"),
      supabase.from("course_lessons").select("*").eq("course_id", course.id).order("position"),
      user
        ? supabase
            .from("course_entitlements")
            .select("id, status")
            .eq("user_id", user.id)
            .eq("course_id", course.id)
            .eq("status", "active")
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const entitlement = entitlementResult.data;
  const price =
    course.pricing_type === "free"
      ? "Free"
      : new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: course.currency,
        }).format(course.price_minor / 100);

  return (
    <main className="min-h-screen bg-[#0b0f19] px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/courses"
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          All courses
        </Link>

        {query.enrolled === "1" && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">
            You are enrolled. The course is now in your account.
          </div>
        )}
        {query.checkout === "pending" && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
            Your order was created. Payment checkout will open here after the payment provider is
            connected; no course access was granted yet.
          </div>
        )}
        {typeof query.message === "string" && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {query.message}
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-primary-500/15 px-3 py-1 text-sm text-primary-200">
                {course.level}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-gray-200">
                {course.language.toUpperCase()}
              </span>
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">{course.title}</h1>
            <p className="mt-6 text-lg leading-8 text-gray-300">{course.summary}</p>
            <p className="mt-4 text-gray-400">
              By {teacher?.display_name ?? "JapanGoLearn teacher"}
            </p>

            <section className="mt-12">
              <h2 className="text-2xl font-bold">About this course</h2>
              <p className="mt-4 whitespace-pre-line leading-7 text-gray-300">
                {course.description || course.summary}
              </p>
            </section>

            <section className="mt-12">
              <h2 className="text-2xl font-bold">Course content</h2>
              <div className="mt-5 space-y-4">
                {(sections ?? []).map((section) => {
                  const sectionLessons = (lessons ?? []).filter(
                    (lesson) => lesson.section_id === section.id
                  );
                  return (
                    <div
                      key={section.id}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                    >
                      <h3 className="border-b border-white/10 px-5 py-4 font-bold">
                        {section.title}
                      </h3>
                      <div className="divide-y divide-white/5">
                        {sectionLessons.length > 0 ? (
                          sectionLessons.map((lesson) => (
                            <div key={lesson.id} className="flex items-center gap-3 px-5 py-4">
                              {lesson.is_preview ||
                              entitlement ||
                              course.pricing_type === "free" ? (
                                <PlayCircle className="h-5 w-5 text-primary-300" />
                              ) : (
                                <LockKeyhole className="h-5 w-5 text-gray-500" />
                              )}
                              <span className="flex-1 text-sm">{lesson.title}</span>
                              {lesson.duration_seconds && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {Math.ceil(lesson.duration_seconds / 60)} min
                                </span>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="px-5 py-4 text-sm text-gray-500">Lessons coming soon.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(sections ?? []).length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/15 p-6 text-gray-400">
                    The teacher is preparing the first lessons.
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-3xl border border-white/10 bg-white/5 p-6 lg:sticky lg:top-24">
            <div className="flex aspect-video items-center justify-center rounded-2xl bg-gradient-to-br from-primary-700/50 to-accent-700/40">
              <BookOpen className="h-14 w-14 text-white/70" />
            </div>
            <p className="mt-6 text-3xl font-black">{price}</p>
            {entitlement ? (
              <Link
                href="/dashboard/courses"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold hover:bg-emerald-500"
              >
                <CheckCircle2 className="h-5 w-5" />
                Continue learning
              </Link>
            ) : (
              <form action={course.pricing_type === "free" ? enrollFreeCourse : startPaidOrder}>
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="slug" value={course.slug} />
                <button className="mt-5 w-full rounded-xl bg-primary-600 px-5 py-3 font-bold hover:bg-primary-500">
                  {course.pricing_type === "free" ? "Enroll free" : "Buy course"}
                </button>
              </form>
            )}
            <ul className="mt-6 space-y-3 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Learn on web and mobile
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Access linked to your account
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </main>
  );
}
