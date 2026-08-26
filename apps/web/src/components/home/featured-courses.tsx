import Link from "next/link";
import { ArrowRight, BookOpen, PlayCircle } from "lucide-react";
import type { CourseRow } from "@japangolearn/database";
import { createStaticClient } from "@/lib/supabase/static";

const FEATURED_LIMIT = 3;

function formatPrice(course: Pick<CourseRow, "pricing_type" | "price_minor" | "currency">) {
  if (course.pricing_type === "free") return "Free";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: course.currency,
    maximumFractionDigits: 0,
  }).format(course.price_minor / 100);
}

type FeaturedCourse = Pick<
  CourseRow,
  | "id"
  | "slug"
  | "title"
  | "summary"
  | "description"
  | "level"
  | "pricing_type"
  | "price_minor"
  | "currency"
>;

async function loadFeaturedCourses(): Promise<FeaturedCourse[]> {
  try {
    const supabase = createStaticClient();
    const { data } = await supabase
      .from("courses")
      .select("id, slug, title, summary, description, level, pricing_type, price_minor, currency")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(FEATURED_LIMIT);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function FeaturedCourses() {
  const courses = await loadFeaturedCourses();

  // Nothing published yet: stay silent rather than advertise an empty catalog.
  if (courses.length === 0) return null;

  return (
    <section className="relative z-10 py-20" aria-labelledby="featured-courses-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="featured-courses-heading"
              className="text-3xl sm:text-4xl font-bold tracking-tight"
            >
              Courses from approved teachers
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-gray-400">
              Go deeper with structured, teacher-led courses. Access stays tied to your account on
              web and mobile.
            </p>
          </div>
          <Link
            href="/courses"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            Browse all courses
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.slug}`}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition hover:-translate-y-1 hover:border-primary-400/50 hover:bg-white/10"
            >
              <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-primary-700/40 to-accent-700/30">
                <PlayCircle className="h-14 w-14 text-white/60 transition group-hover:scale-110" />
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
                <h3 className="text-xl font-bold text-white">{course.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">
                  {course.summary || course.description}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm text-gray-300">
                  <BookOpen className="h-4 w-4" />
                  View course
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
