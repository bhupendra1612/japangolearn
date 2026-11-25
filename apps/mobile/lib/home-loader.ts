import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@japangolearn/database";
import type { HomeActivity } from "./home-study";

export type HomeSnapshot = {
  userId: string;
  day: string;
  xp: number;
  streak: number;
  dailyXp: number;
  dailyTarget: number;
  activities: HomeActivity[];
};

export function homeCacheKey(userId: string) {
  return `home-progress:v1:${userId}`;
}

/** Reject another account's or malformed cached progress before rendering it. */
export function parseHomeSnapshot(value: unknown, userId: string): HomeSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as HomeSnapshot;
  if (
    row.userId !== userId ||
    typeof row.day !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(row.day) ||
    ![row.xp, row.streak, row.dailyXp, row.dailyTarget].every(
      (v) => typeof v === "number" && Number.isFinite(v) && v >= 0
    ) ||
    row.dailyTarget === 0 ||
    !Array.isArray(row.activities)
  )
    return null;
  if (
    row.activities.some(
      (a) =>
        !a ||
        typeof a.id !== "string" ||
        typeof a.type !== "string" ||
        typeof a.title !== "string" ||
        typeof a.created_at !== "string" ||
        !Number.isFinite(a.xp_earned)
    )
  )
    return null;
  return row;
}

export async function loadHomeSnapshot(
  client: SupabaseClient<Database>,
  userId: string,
  now: Date,
  signal: AbortSignal
): Promise<HomeSnapshot> {
  // The XP ledger resets at UTC midnight, independently of the local study day.
  const day = now.toISOString().slice(0, 10);
  const [goal, activity, profile] = await Promise.all([
    client
      .from("daily_goals")
      .select("xp_earned,xp_target")
      .eq("user_id", userId)
      .eq("date", day)
      .abortSignal(signal)
      .maybeSingle(),
    client
      .from("activity_log")
      .select("id,type,title,created_at,xp_earned,metadata")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(8)
      .abortSignal(signal),
    client
      .from("profiles")
      .select("xp,streak_days,daily_xp_goal")
      .eq("id", userId)
      .abortSignal(signal)
      .single(),
  ]);
  for (const result of [goal, activity, profile]) if (result.error) throw result.error;
  if (!profile.data) throw new Error("Learning profile is unavailable");
  return {
    userId,
    day,
    xp: profile.data.xp ?? 0,
    streak: profile.data.streak_days ?? 0,
    dailyXp: goal.data?.xp_earned ?? 0,
    dailyTarget: goal.data?.xp_target ?? profile.data.daily_xp_goal ?? 100,
    activities: activity.data ?? [],
  };
}
