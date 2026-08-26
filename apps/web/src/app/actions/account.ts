"use server";

import { createClient } from "@/lib/supabase/server";
import { err, errorFromUnknown, ok } from "@japangolearn/core";

export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return err({ code: "UNAUTHORIZED", message: "You must be signed in to delete your account" });
  }

  try {
    const { error } = await supabase.rpc("delete_account");
    if (error) throw error;

    await supabase.auth.signOut();

    return ok(null);
  } catch (error: unknown) {
    console.error("Error deleting account:", error);
    return err(errorFromUnknown(error, "DATABASE_ERROR"));
  }
}
