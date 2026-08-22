import { CheckCircle2, PlusCircle, Video } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VideoUploader } from "@/components/teacher/video-uploader";
import { requireTeacherStudio } from "@/lib/marketplace";
import { addCourseLesson, addCourseSection, publishCourse } from "../../actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-900";

export const dynamic = "force-dynamic";

export default async function TeacherCourseEditorPage({ params, searchParams }: PageProps) {
  requireTeacherStudio();

  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: course }, { data: sections }, { data: lessons }, { data: videoAssets }] =
    await Promise.all([
      supabase.from("courses").select("*").eq("id", id).eq("teacher_id", user.id).maybeSingle(),
      supabase.from("course_sections").select("*").eq("course_id", id).order("position"),
      supabase.from("course_lessons").select("*").eq("course_id", id).order("position"),
      supabase
        .from("video_assets")
        .select("*")
        .eq("course_id", id)
        .order("created_at", { ascending: false }),
    ]);
  if (!course) notFound();

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-primary-600">{course.status}</p>
          <h1 className="mt-2 text-3xl font-black">{course.title}</h1>
          <p className="mt-2 text-gray-500">Add sections, written lessons, and videos.</p>
        </div>
        {course.status !== "published" && (
          <form action={publishCourse}>
            <input type="hidden" name="courseId" value={course.id} />
            <button className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white">
              <CheckCircle2 className="h-5 w-5" />
              Publish course
            </button>
          </form>
        )}
      </div>

      {typeof query.error === "string" && (
        <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          {query.error}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          {(sections ?? []).map((section) => (
            <div
              key={section.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <h2 className="font-bold">{section.title}</h2>
              <div className="mt-4 space-y-2">
                {(lessons ?? [])
                  .filter((lesson) => lesson.section_id === section.id)
                  .map((lesson) => (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800"
                    >
                      {lesson.lesson_type === "video" ? (
                        <Video className="h-4 w-4 text-primary-500" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="flex-1">{lesson.title}</span>
                      {lesson.is_preview && (
                        <span className="text-xs font-bold text-emerald-600">PREVIEW</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
          {(sections ?? []).length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500 dark:border-gray-700">
              Create the first section to start adding lessons.
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <VideoUploader courseId={course.id} />

          {(videoAssets ?? []).length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="font-bold">Video library</h2>
              <div className="mt-3 space-y-2">
                {(videoAssets ?? []).map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between gap-3">
                    <span className="truncate">{asset.title}</span>
                    <span className="text-xs font-bold uppercase text-gray-500">
                      {asset.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form
            action={addCourseSection}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <input type="hidden" name="courseId" value={course.id} />
            <h2 className="flex items-center gap-2 font-bold">
              <PlusCircle className="h-5 w-5" />
              Add section
            </h2>
            <input
              name="title"
              required
              placeholder="Section title"
              className={`${inputClass} mt-4`}
            />
            <button className="mt-3 w-full rounded-xl bg-primary-600 px-4 py-3 font-bold text-white">
              Add section
            </button>
          </form>

          {(sections ?? []).length > 0 && (
            <form
              action={addCourseLesson}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <input type="hidden" name="courseId" value={course.id} />
              <h2 className="font-bold">Add lesson</h2>
              <div className="mt-4 space-y-3">
                <select name="sectionId" required className={inputClass}>
                  {(sections ?? []).map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.title}
                    </option>
                  ))}
                </select>
                <input name="title" required placeholder="Lesson title" className={inputClass} />
                <select name="lessonType" className={inputClass} defaultValue="article">
                  <option value="article">Article</option>
                  <option value="video">Video</option>
                  <option value="quiz">Quiz</option>
                  <option value="download">Download</option>
                </select>
                <select name="videoAssetId" className={inputClass} defaultValue="">
                  <option value="">No video attached</option>
                  {(videoAssets ?? []).map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.title} ({asset.status})
                    </option>
                  ))}
                </select>
                <input name="summary" placeholder="Short summary" className={inputClass} />
                <textarea name="body" rows={5} placeholder="Lesson text" className={inputClass} />
                <label className="flex items-center gap-2 text-sm">
                  <input name="isPreview" type="checkbox" />
                  Allow public preview
                </label>
                <button className="w-full rounded-xl bg-primary-600 px-4 py-3 font-bold text-white">
                  Add lesson
                </button>
              </div>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
