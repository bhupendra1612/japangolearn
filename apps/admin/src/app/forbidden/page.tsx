import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ForbiddenPage() {
  return (
    <main className="auth-page">
      <ThemeToggle className="auth-theme-toggle" />
      <section className="auth-card">
        <span className="brand-mark">
          <ShieldAlert size={20} aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow">Access denied</p>
          <h1>Admin role required</h1>
          <p>
            This app is protected by Supabase auth and only users with <strong>role = admin</strong>{" "}
            in the profiles table can enter.
          </p>
        </div>
        <Link className="primary-button" href="/login">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
