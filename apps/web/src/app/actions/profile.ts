"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error";
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const displayName = formData.get("display_name") as string;
  const jlptLevel = formData.get("current_jlpt_level") as string;

  // Validate
  if (!displayName || displayName.trim().length < 2) {
    return { success: false, error: "Display name must be at least 2 characters" };
  }

  const validLevels = ["N5", "N4", "N3", "N2", "N1"];
  if (!validLevels.includes(jlptLevel)) {
    return { success: false, error: "Invalid JLPT level" };
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        current_jlpt_level: jlptLevel,
      })
      .eq("id", user.id);

    if (error) throw error;

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    console.error("Error updating profile:", err);
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const file = formData.get("avatar") as File;
  if (!file || file.size === 0) {
    return { success: false, error: "No file selected" };
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "Only JPEG, PNG, WebP, and GIF images are allowed" };
  }

  // Validate file size (2MB max)
  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: "Image must be smaller than 2MB" };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `avatars/${user.id}/avatar.${ext}`;

  try {
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);

    // Update profile with avatar URL (append timestamp to bust cache)
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id);

    if (updateError) throw updateError;

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard");

    return { success: true, avatarUrl };
  } catch (err: unknown) {
    console.error("Error uploading avatar:", err);
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const displayName = formData.get("display_name") as string;
  const jlptLevel = formData.get("current_jlpt_level") as string;

  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName?.trim() || user.email?.split("@")[0],
        current_jlpt_level: jlptLevel || "N5",
        onboarding_completed: true,
      })
      .eq("id", user.id);

    if (error) throw error;

    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    console.error("Error completing onboarding:", err);
    return { success: false, error: getErrorMessage(err) };
  }
}
