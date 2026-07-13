import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="brand-mark">日</span>
        <div>
          <p className="eyebrow">Access denied</p>
          <h1>Admin role required</h1>
          <p>
            This app is protected by Supabase auth and only users with <strong>role = admin</strong>{" "}
            in the profiles table can enter.
          </p>
        </div>
        <Link className="primary-button" href="/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
