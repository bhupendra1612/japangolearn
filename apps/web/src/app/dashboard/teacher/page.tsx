import { BookOpen, Clock3, GraduationCap, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTeacherStudio } from "@/lib/marketplace";
import { createCourse, saveTeacherProfile, submitTeacherApplication } from "./actions";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900";

export default async function TeacherDashboardPage({ searchParams }: PageProps) {
  requireTeacherStudio();

  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: teacher }, { data: courses }] = await Promise.all([
    supabase.from("teacher_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("courses")
      .select("*")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex items-start gap-4">
        <div className="rounded-2xl bg-primary-100 p-3 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
          <GraduationCap className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black">Teacher studio</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Apply once, then create free or paid Japanese courses with this same account.
          </p>
        </div>
      </div>

      {query.submitted === "1" && (
        <div className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          Your teacher application was submitted for review.
        </div>
      )}
      {typeof query.error === "string" && (
        <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          {query.error}
        </div>
      )}

      {!teacher || teacher.status === "draft" || teacher.status === "changes_requested" ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-bold">Teacher profile</h2>
          {teacher?.review_notes && (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              Review note: {teacher.review_notes}
            </p>
          )}
          <form action={saveTeacherProfile} className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Display name
              <input
                name="displayName"
                required
                defaultValue={teacher?.display_name ?? ""}
                className={`${inputClass} mt-2`}
              />
            </label>
            <label className="text-sm font-medium">
              Public profile slug
              <input
                name="slug"
                defaultValue={teacher?.slug ?? ""}
                placeholder="your-name"
                className={`${inputClass} mt-2`}
              />
            </label>
            <label className="text-sm font-medium md:col-span-2">
              Bio
              <textarea
                name="bio"
                rows={4}
                defaultValue={teacher?.bio ?? ""}
                className={`${inputClass} mt-2`}
              />
            </label>
            <label className="text-sm font-medium">
              Qualifications
              <textarea
                name="qualifications"
                rows={3}
                defaultValue={teacher?.qualifications ?? ""}
                className={`${inputClass} mt-2`}
              />
            </label>
            <label className="text-sm font-medium">
              Years of teaching experience
              <input
                name="experienceYears"
                type="number"
                min="0"
                max="80"
                defaultValue={teacher?.experience_years ?? 0}
                className={`${inputClass} mt-2`}
              />
            </label>
            <button className="rounded-xl bg-primary-600 px-5 py-3 font-bold text-white md:col-span-2">
              Save teacher profile
            </button>
          </form>
          {teacher && (
            <form action={submitTeacherApplication} className="mt-4">
              <button className="w-full rounded-xl border border-primary-500 px-5 py-3 font-bold text-primary-600 dark:text-primary-300">
                Submit for approval
              </button>
            </form>
          )}
        </section>
      ) : teacher.status !== "approved" ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <Clock3 className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-4 text-xl font-bold">Application status: {teacher.status}</h2>
          <p className="mt-2 text-gray-500">
            An admin or content reviewer must approve the profile before course publishing is
            enabled.
          </p>
        </section>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
            <ShieldCheck className="h-5 w-5" />
            Approved teacher account
          </div>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-bold">Create a course</h2>
            <form action={createCourse} className="mt-6 grid gap-4 md:grid-cols-2">
              <input name="title" required placeholder="Course title" className={inputClass} />
              <input name="slug" placeholder="course-url-slug" className={inputClass} />
              <select name="level" className={inputClass} defaultValue="N5">
                {["N5", "N4", "N3", "N2", "N1", "ALL"].map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
              <select name="pricingType" className={inputClass} defaultValue="free">
                <option value="free">Free course</option>
                <option value="paid">Paid course</option>
              </select>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="Price in INR (paid only)"
                className={inputClass}
              />
              <input name="summary" placeholder="Short summary" className={inputClass} />
              <textarea
                name="description"
                rows={4}
                placeholder="Full course description"
                className={`${inputClass} md:col-span-2`}
              />
              <button className="rounded-xl bg-primary-600 px-5 py-3 font-bold text-white md:col-span-2">
                Create draft and add lessons
              </button>
            </form>
          </section>

          <section>
            <h2 className="text-xl font-bold">Your courses</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {(courses ?? []).map((course) => (
                <Link
                  key={course.id}
                  href={`/dashboard/teacher/courses/${course.id}`}
                  className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <BookOpen className="h-6 w-6 text-primary-500" />
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase dark:bg-gray-800">
                      {course.status}
                    </span>
                  </div>
                  <h3 className="mt-4 font-bold">{course.title}</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {course.pricing_type === "free"
                      ? "Free"
                      : new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: course.currency,
                        }).format(course.price_minor / 100)}
                  </p>
                </Link>
              ))}
              {(courses ?? []).length === 0 && (
                <p className="text-sm text-gray-500">No course drafts yet.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
