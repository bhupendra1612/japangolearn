"use server";

import { createClient } from "@/lib/supabase/server";

type AchievementCondition = {
  type?: unknown;
  threshold?: unknown;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error";
}

export async function awardXp({
  type,
  title,
  description = "",
  xpAmount,
}: {
  type: string;
  title: string;
  description?: string;
  xpAmount: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // 1. Log activity
    await supabase.from("activity_log").insert({
      user_id: user.id,
      type,
      title,
      description,
      xp_earned: xpAmount,
    });

    // 2. Update profile XP and Streak
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp, last_active_at, streak_days")
      .eq("id", user.id)
      .single();

    if (profile) {
      const todayDateObj = new Date();
      const today = todayDateObj.toISOString().split("T")[0];
      const lastActive = profile.last_active_at
        ? new Date(profile.last_active_at).toISOString().split("T")[0]
        : null;

      let newStreak = profile.streak_days;

      if (lastActive !== today) {
        const yesterdayDateObj = new Date(Date.now() - 86400000);
        const yesterday = yesterdayDateObj.toISOString().split("T")[0];

        if (lastActive === yesterday) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }

      await supabase
        .from("profiles")
        .update({
          xp: profile.xp + xpAmount,
          streak_days: newStreak,
          last_active_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    // 3. Check achievement unlocks (fire and forget)
    checkAndUnlockAchievements().catch(() => {});

    return { success: true };
  } catch (err: unknown) {
    console.error("Error awarding XP:", err);
    return { success: false, error: getErrorMessage(err) };
  }
}

export async function updateDailyTaskProgress({
  taskId,
  xpAmount,
}: {
  taskId: string;
  xpAmount: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  void taskId;
  const today = new Date().toISOString().split("T")[0];

  try {
    // Check if daily goal exists for today
    const { data: dailyGoal } = await supabase
      .from("daily_goals")
      .select("id, xp_earned, tasks_completed")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    if (dailyGoal) {
      await supabase
        .from("daily_goals")
        .update({
          xp_earned: dailyGoal.xp_earned + xpAmount,
          tasks_completed: dailyGoal.tasks_completed + 1,
        })
        .eq("id", dailyGoal.id);
    } else {
      await supabase.from("daily_goals").insert({
        user_id: user.id,
        date: today,
        xp_earned: xpAmount,
        tasks_completed: 1,
        xp_target: 100,
        tasks_total: 4,
      });
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("Error updating daily task progress:", err);
    return { success: false, error: getErrorMessage(err) };
  }
}

/**
 * Checks the user's current stats against achievement conditions
 * and unlocks any newly earned achievements.
 */
export async function checkAndUnlockAchievements() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  try {
    // Fetch all needed data in parallel
    const [
      { data: profile },
      { data: allAchievements },
      { data: userAchievements },
      { count: activityCount },
    ] = await Promise.all([
      supabase.from("profiles").select("xp, streak_days").eq("id", user.id).single(),
      supabase.from("achievements").select("id, condition"),
      supabase.from("user_achievements").select("achievement_id").eq("user_id", user.id),
      supabase
        .from("activity_log")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    if (!profile || !allAchievements) return;

    const unlockedIds = new Set(userAchievements?.map((ua) => ua.achievement_id) ?? []);
    const totalActivities = activityCount ?? 0;

    // Check each achievement
    const toUnlock: string[] = [];

    for (const ach of allAchievements) {
      if (unlockedIds.has(ach.id)) continue; // already unlocked

      const cond = ach.condition as AchievementCondition | null;
      if (!cond) continue;

      let earned = false;

      if (cond.type === "xp" && typeof cond.threshold === "number") {
        earned = profile.xp >= cond.threshold;
      } else if (cond.type === "streak" && typeof cond.threshold === "number") {
        earned = profile.streak_days >= cond.threshold;
      } else if (cond.type === "activities" && typeof cond.threshold === "number") {
        earned = totalActivities >= cond.threshold;
      }

      if (earned) {
        toUnlock.push(ach.id);
      }
    }

    // Bulk insert unlocked achievements
    if (toUnlock.length > 0) {
      await supabase.from("user_achievements").insert(
        toUnlock.map((achievement_id) => ({
          user_id: user.id,
          achievement_id,
        }))
      );
    }

    return { unlocked: toUnlock };
  } catch (err: unknown) {
    console.error("Error checking achievements:", err);
  }
}
