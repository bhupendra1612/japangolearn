import { BookOpen, PlayCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCourseCatalog } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

export default async function MyCoursesPage() {
  requireCourseCatalog();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: entitlements } = await supabase
    .from("course_entitlements")
    .select("course_id, source, granted_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("granted_at", { ascending: false });

  const courseIds = (entitlements ?? []).map((item) => item.course_id);
  const { data: courses } =
    courseIds.length > 0
      ? await supabase.from("courses").select("*").in("id", courseIds)
      : { data: [] };

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black">My courses</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Free enrollments and purchased courses appear here.
        </p>
      </div>

      {courses && courses.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.slug}`}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:-translate-y-1 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-primary-500/20 to-accent-500/20">
                <PlayCircle className="h-12 w-12 text-primary-500" />
              </div>
              <div className="p-5">
                <span className="text-xs font-bold uppercase text-primary-600">{course.level}</span>
                <h2 className="mt-2 text-lg font-bold">{course.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm text-gray-500">{course.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-lg font-bold">No enrolled courses yet</h2>
          <Link
            href="/courses"
            className="mt-5 inline-flex rounded-xl bg-primary-600 px-5 py-3 font-semibold text-white"
          >
            Browse courses
          </Link>
        </div>
      )}
    </div>
  );
}
