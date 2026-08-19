"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { err, errorFromUnknown, ok, MASTERY_ITEM_TYPES } from "@japangolearn/core";
import type { MasteryItemType } from "@japangolearn/core";

const MAX_TITLE = 60;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createSavedList(title: string) {
  const clean = title.trim().slice(0, MAX_TITLE);
  if (clean.length < 1) {
    return err({ code: "VALIDATION_ERROR", message: "Give the list a name." });
  }

  try {
    const { supabase, user } = await requireUser();
    if (!user) return err({ code: "UNAUTHORIZED", message: "Unauthorized" });

    const { data, error } = await supabase
      .from("practice_lists")
      .insert({ user_id: user.id, title: clean })
      .select("id")
      .single();

    if (error) return err({ code: "DATABASE_ERROR", message: error.message });

    revalidatePath("/dashboard/saved");
    return ok(data.id as string);
  } catch (error: unknown) {
    console.error("Error creating saved list:", error);
    return err(errorFromUnknown(error, "DATABASE_ERROR"));
  }
}

export async function deleteSavedList(listId: string) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return err({ code: "UNAUTHORIZED", message: "Unauthorized" });

    /* RLS already restricts this to the owner; the explicit user_id filter
       makes that intent visible at the call site too. */
    const { error } = await supabase
      .from("practice_lists")
      .delete()
      .eq("id", listId)
      .eq("user_id", user.id);

    if (error) return err({ code: "DATABASE_ERROR", message: error.message });

    revalidatePath("/dashboard/saved");
    return ok(null);
  } catch (error: unknown) {
    console.error("Error deleting saved list:", error);
    return err(errorFromUnknown(error, "DATABASE_ERROR"));
  }
}

export async function addItemToList({
  listId,
  itemType,
  itemId,
}: {
  listId: string;
  itemType: MasteryItemType;
  itemId: number;
}) {
  if (!MASTERY_ITEM_TYPES.includes(itemType) || !Number.isInteger(itemId)) {
    return err({ code: "VALIDATION_ERROR", message: "That item cannot be saved." });
  }

  try {
    const { supabase, user } = await requireUser();
    if (!user) return err({ code: "UNAUTHORIZED", message: "Unauthorized" });

    const { error } = await supabase
      .from("practice_list_items")
      .insert({ list_id: listId, item_type: itemType, item_id: itemId });

    /* 23505 is a duplicate — the item is already saved, which is the state the
       learner wanted, so it is reported as success rather than an error. */
    if (error && error.code !== "23505") {
      return err({ code: "DATABASE_ERROR", message: error.message });
    }

    revalidatePath("/dashboard/saved");
    revalidatePath(`/dashboard/saved/${listId}`);
    return ok(null);
  } catch (error: unknown) {
    console.error("Error adding item to list:", error);
    return err(errorFromUnknown(error, "DATABASE_ERROR"));
  }
}

export async function removeItemFromList({
  itemRowId,
  listId,
}: {
  itemRowId: string;
  listId: string;
}) {
  try {
    const { supabase, user } = await requireUser();
    if (!user) return err({ code: "UNAUTHORIZED", message: "Unauthorized" });

    const { error } = await supabase.from("practice_list_items").delete().eq("id", itemRowId);

    if (error) return err({ code: "DATABASE_ERROR", message: error.message });

    revalidatePath("/dashboard/saved");
    revalidatePath(`/dashboard/saved/${listId}`);
    return ok(null);
  } catch (error: unknown) {
    console.error("Error removing item from list:", error);
    return err(errorFromUnknown(error, "DATABASE_ERROR"));
  }
}
