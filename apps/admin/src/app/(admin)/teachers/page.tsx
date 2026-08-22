import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AlertTriangle, Check, GraduationCap, Inbox, PenLine, X } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { requireTeacherReview } from "@/lib/marketplace";

export const dynamic = "force-dynamic";

async function reviewTeacher(formData: FormData) {
  "use server";

  requireTeacherReview();
  const { supabase } = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const { error } = await supabase.rpc("review_teacher_application", {
    target_user_id: userId,
    decision,
    /* The RPC declares notes with DEFAULT NULL, so omitting it and passing
       null are equivalent — and undefined is what the generated type accepts. */
    notes: notes || undefined,
  });

  if (error) redirect(`/teachers?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/teachers");
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TeacherApprovalsPage({ searchParams }: PageProps) {
  requireTeacherReview();

  const query = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: teachers, error } = await supabase
    .from("teacher_profiles")
    .select("*")
    .in("status", ["submitted", "under_review", "changes_requested", "approved", "rejected"])
    .order("submitted_at", { ascending: false, nullsFirst: false });

  return (
    <div className="stack">
      <section className="panel">
        <div className="section-heading">
          <div className="section-heading-main">
            <span className="section-icon">
              <GraduationCap size={18} aria-hidden="true" />
            </span>
            <div style={{ minWidth: 0 }}>
              <p className="eyebrow">Marketplace</p>
              <h2>Teacher approvals</h2>
              <p>Review teacher profiles before they can create and publish courses.</p>
            </div>
          </div>
        </div>

        {(error || typeof query.error === "string") && (
          <div className="form-error">
            <AlertTriangle size={18} aria-hidden="true" />
            <span>{typeof query.error === "string" ? query.error : error?.message}</span>
          </div>
        )}

        {teachers && teachers.length > 0 ? (
          <div className="teacher-review-list">
            {teachers.map((teacher) => (
              <article className="teacher-review-card" key={teacher.user_id}>
                <div className="teacher-review-heading">
                  <div>
                    <h3>{teacher.display_name}</h3>
                    <p className="mono">{teacher.user_id}</p>
                  </div>
                  <span className={`status-pill status-${teacher.status}`}>{teacher.status}</span>
                </div>
                <dl className="teacher-details">
                  <div>
                    <dt>Experience</dt>
                    <dd>{teacher.experience_years} years</dd>
                  </div>
                  <div>
                    <dt>Public slug</dt>
                    <dd>{teacher.slug}</dd>
                  </div>
                  <div>
                    <dt>Qualifications</dt>
                    <dd>{teacher.qualifications || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt>Bio</dt>
                    <dd>{teacher.bio || "Not provided"}</dd>
                  </div>
                </dl>
                <form action={reviewTeacher} className="teacher-review-form">
                  <input type="hidden" name="userId" value={teacher.user_id} />
                  <label>
                    Review notes
                    <textarea
                      name="notes"
                      defaultValue={teacher.review_notes ?? ""}
                      rows={3}
                      placeholder="Optional for approval; explain changes when requesting them."
                    />
                  </label>
                  <div className="teacher-review-actions">
                    <button className="primary-button" name="decision" value="approved">
                      <Check size={16} aria-hidden="true" />
                      Approve teacher
                    </button>
                    <button className="secondary-button" name="decision" value="changes_requested">
                      <PenLine size={16} aria-hidden="true" />
                      Request changes
                    </button>
                    <button className="danger-button" name="decision" value="rejected">
                      <X size={16} aria-hidden="true" />
                      Reject
                    </button>
                  </div>
                </form>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Inbox aria-hidden="true" />
            <strong>No teacher applications</strong>
            <span>Submitted applications will appear here.</span>
          </div>
        )}
      </section>
    </div>
  );
}
