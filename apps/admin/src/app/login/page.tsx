import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params?.error;

  return (
    <main className="auth-page">
      <form action={signIn} className="auth-card">
        <span className="brand-mark">日</span>
        <div>
          <p className="eyebrow">Admin access</p>
          <h1>Sign in</h1>
          <p>Use an account whose profile role is set to admin.</p>
        </div>
        {error && <div className="form-error">{error}</div>}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <input name="next" type="hidden" value={params?.next ?? "/"} />
        <button className="primary-button" type="submit">
          Sign in
        </button>
      </form>
    </main>
  );
}

async function signIn(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle<{ role: string | null }>();

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    redirect("/forbidden");
  }

  redirect(next.startsWith("/") ? next : "/");
}
