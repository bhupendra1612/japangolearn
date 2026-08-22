import type { Metadata } from "next";
import type { CourseRow, TeacherProfileRow } from "@japangolearn/database";
import { BookOpen, GraduationCap, LockKeyhole, PlayCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { courseCatalogEnabled, requireCourseCatalog } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export const metadata: Metadata = courseCatalogEnabled
  ? {
      title: "Japanese Courses — Learn from Approved Teachers",
      description:
        "Browse free and paid Japanese courses from approved JapanGoLearn teachers. JLPT-aligned video and article lessons you can start on web or mobile.",
      alternates: { canonical: "https://japangolearn.com/courses" },
      openGraph: {
        title: "Japanese Courses | JapanGoLearn",
        description:
          "Free and paid Japanese courses from approved teachers, aligned to the JLPT path.",
        url: "https://japangolearn.com/courses",
      },
    }
  : { title: "Not found", robots: { index: false, follow: false } };

function formatPrice(course: CourseRow) {
  if (course.pricing_type === "free") return "Free";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: course.currency,
  }).format(course.price_minor / 100);
}

export default async function CoursesPage() {
  requireCourseCatalog();

  const supabase = await createClient();
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const teacherIds = [...new Set((courses ?? []).map((course) => course.teacher_id))];
  let teachers: Pick<TeacherProfileRow, "user_id" | "display_name" | "slug">[] = [];

  if (teacherIds.length > 0) {
    const result = await supabase
      .from("teacher_profiles")
      .select("user_id, display_name, slug")
      .in("user_id", teacherIds);
    teachers = result.data ?? [];
  }

  const teacherNames = new Map(teachers.map((teacher) => [teacher.user_id, teacher.display_name]));

  return (
    <main className="min-h-screen bg-[#0b0f19] px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-primary-200">
            <GraduationCap className="h-4 w-4" />
            Learn from approved teachers
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">Japanese courses</h1>
          <p className="mt-5 text-lg leading-8 text-gray-400">
            Choose free learning material or buy a complete teacher-led course. Your course access
            stays attached to the same JapanGoLearn account.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            The course catalog is not available yet. Apply the marketplace migration, then refresh
            this page.
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.slug}`}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:border-primary-400/50 hover:bg-white/10"
              >
                <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-primary-700/40 to-accent-700/30">
                  {course.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <PlayCircle className="h-14 w-14 text-white/60 transition group-hover:scale-110" />
                  )}
                </div>
                <div className="p-6">
                  <div className="mb-3 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-wide">
                    <span className="rounded-full bg-primary-500/15 px-3 py-1 text-primary-200">
                      {course.level}
                    </span>
                    <span
                      className={
                        course.pricing_type === "free" ? "text-emerald-300" : "text-amber-300"
                      }
                    >
                      {formatPrice(course)}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold">{course.title}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">
                    {course.summary || course.description}
                  </p>
                  <div className="mt-5 flex items-center gap-2 text-sm text-gray-300">
                    {course.pricing_type === "free" ? (
                      <BookOpen className="h-4 w-4" />
                    ) : (
                      <LockKeyhole className="h-4 w-4" />
                    )}
                    {teacherNames.get(course.teacher_id) ?? "JapanGoLearn teacher"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-gray-500" />
            <h2 className="mt-4 text-xl font-bold">Courses are being prepared</h2>
            <p className="mt-2 text-gray-400">
              Approved teachers can publish the first free or paid course from their dashboard.
            </p>
            <Link
              href="/dashboard/teacher"
              className="mt-6 inline-flex rounded-xl bg-primary-600 px-5 py-3 font-semibold hover:bg-primary-500"
            >
              Become a teacher
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
