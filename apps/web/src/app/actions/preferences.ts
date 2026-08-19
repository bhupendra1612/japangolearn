"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { err, errorFromUnknown, ok } from "@japangolearn/core";

/* Not exported: a "use server" module may only export async functions, and
   these bounds mirror the CHECK constraint on profiles.daily_xp_goal. */
const MIN_DAILY_GOAL = 10;
const MAX_DAILY_GOAL = 1000;

/**
 * Sets the learner's daily XP target.
 *
 * Goes through the `set_daily_xp_goal` RPC rather than a direct table write:
 * learners have no UPDATE grant on `daily_goals`, and the RPC also moves today's
 * existing row so the change applies now instead of tomorrow.
 */
export async function setDailyXpGoal(goal: number) {
  if (!Number.isInteger(goal) || goal < MIN_DAILY_GOAL || goal > MAX_DAILY_GOAL) {
    return err({
      code: "VALIDATION_ERROR",
      message: `Daily goal must be between ${MIN_DAILY_GOAL} and ${MAX_DAILY_GOAL} XP.`,
    });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_daily_xp_goal", { p_goal: goal });

    if (error) {
      return err({
        code: error.code === "42501" ? "UNAUTHORIZED" : "DATABASE_ERROR",
        message: error.message,
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/tasks");
    return ok(goal);
  } catch (error: unknown) {
    console.error("Error setting daily XP goal:", error);
    return err(errorFromUnknown(error, "DATABASE_ERROR"));
  }
}

/** Stamps the read marker the notification feed compares against. */
export async function markNotificationsSeen() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("mark_notifications_seen");

    if (error) {
      return err({
        code: error.code === "42501" ? "UNAUTHORIZED" : "DATABASE_ERROR",
        message: error.message,
      });
    }

    revalidatePath("/dashboard");
    return ok(null);
  } catch (error: unknown) {
    console.error("Error marking notifications seen:", error);
    return err(errorFromUnknown(error, "DATABASE_ERROR"));
  }
}
