import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AdminProfile = {
  id: string;
  display_name: string | null;
  role: string | null;
};

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", user.id)
    .maybeSingle<AdminProfile>();

  if (profile?.role !== "admin") {
    redirect("/forbidden");
  }

  return {
    supabase,
    user,
    profile,
  };
}
