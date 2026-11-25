import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@japangolearn/database";

export const DAILY_GOAL_OPTIONS = [25, 50, 100, 200] as const;

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function weekStart(now: Date): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  return start;
}

export function buildActivityWeek(rows: { created_at: string }[], now: Date) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const date = new Date(row.created_at);
    if (!Number.isNaN(date.getTime()) && date <= now) {
      const key = localDateKey(date);
      counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return Array.from({ length: 7 }, (_, index) => {
    const date = weekStart(now);
    date.setDate(date.getDate() + index);
    const key = localDateKey(date);
    return {
      date: key,
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      day: date.getDate(),
      today: index === 6,
      count: counts[key] ?? 0,
    };
  });
}

export type ProfileProgress = {
  week: ReturnType<typeof buildActivityWeek>;
  dailyXp: number;
  dailyTarget: number;
  achievements: number;
  updatedAt: string;
};

export async function loadProfileProgress(
  client: SupabaseClient<Database>,
  userId: string,
  now = new Date(),
  signal?: AbortSignal
): Promise<ProfileProgress> {
  // Daily XP is awarded by the server on UTC days. Calendar activity uses the
  // learner's local midnight instead; the UI explains the goal's reset time.
  const todayUtc = now.toISOString().slice(0, 10);
  const requestSignal = signal ?? new AbortController().signal;
  const [goal, profile, trophies] = await Promise.all([
    client
      .from("daily_goals")
      .select("xp_earned,xp_target")
      .eq("user_id", userId)
      .eq("date", todayUtc)
      .abortSignal(requestSignal)
      .maybeSingle(),
    client
      .from("profiles")
      .select("daily_xp_goal")
      .eq("id", userId)
      .abortSignal(requestSignal)
      .single(),
    client
      .from("user_achievements")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("achievement_id", "is", null)
      .abortSignal(requestSignal),
  ]);
  for (const result of [goal, profile, trophies]) if (result.error) throw result.error;

  // Paginate instead of silently dropping activity above the API's row limit.
  const activity: { created_at: string }[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await client
      .from("activity_log")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", weekStart(now).toISOString())
      .lte("created_at", now.toISOString())
      .order("created_at")
      .order("id")
      .range(offset, offset + 499)
      .abortSignal(requestSignal);
    if (result.error) throw result.error;
    activity.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) break;
  }
  return {
    week: buildActivityWeek(activity, now),
    dailyXp: goal.data?.xp_earned ?? 0,
    dailyTarget: goal.data?.xp_target ?? profile.data?.daily_xp_goal ?? 100,
    achievements: trophies.count ?? 0,
    updatedAt: now.toISOString(),
  };
}

export async function saveDailyGoal(client: SupabaseClient<Database>, goal: number) {
  if (!Number.isInteger(goal) || goal < 10 || goal > 1000)
    throw new Error("Choose a goal from 10 to 1,000 XP.");
  const { data, error } = await client.rpc("set_daily_xp_goal", { p_goal: goal });
  if (error) throw error;
  if (data !== goal) throw new Error("Your goal could not be confirmed. Please retry.");
  return data;
}
