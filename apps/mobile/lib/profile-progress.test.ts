import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@japangolearn/database";
import {
  buildActivityWeek,
  weekStart,
  loadProfileProgress,
  saveDailyGoal,
} from "./profile-progress";

afterEach(() => vi.unstubAllEnvs());

describe("profile activity calendar", () => {
  it("includes the whole first local day and crosses month boundaries", () => {
    vi.stubEnv("TZ", "Asia/Kolkata");
    const now = new Date("2026-10-02T12:00:00+05:30");
    expect(weekStart(now).toISOString()).toBe("2026-09-25T18:30:00.000Z");
    const days = buildActivityWeek(
      [
        { created_at: "2026-09-25T18:31:00Z" },
        { created_at: "2026-10-01T20:00:00Z" },
        { created_at: "2026-10-02T00:01:00Z" },
        { created_at: "2026-10-03T00:01:00Z" },
        { created_at: "invalid" },
      ],
      now
    );
    expect(days).toHaveLength(7);
    expect(days[0]).toMatchObject({ date: "2026-09-26", count: 1 });
    expect(days[6]).toMatchObject({ date: "2026-10-02", today: true, count: 2 });
  });

  it("handles the daylight-saving transition without losing a calendar day", () => {
    vi.stubEnv("TZ", "America/New_York");
    const days = buildActivityWeek([], new Date("2026-11-03T12:00:00-05:00"));
    expect(days.map((day) => day.date)).toEqual([
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
  });
});

function fakeClient(
  options: {
    activityPages?: { created_at: string }[][];
    error?: string;
    goal?: { xp_earned: number; xp_target: number } | null;
  } = {}
) {
  const filters: unknown[][] = [];
  let page = 0;
  const client = {
    rpc: vi.fn().mockResolvedValue({ data: 50, error: null }),
    from: vi.fn((table: string) => {
      const result = () =>
        options.error === table
          ? { data: null, error: new Error("Offline") }
          : {
              data:
                table === "activity_log"
                  ? (options.activityPages?.[page++] ?? [])
                  : table === "profiles"
                    ? { daily_xp_goal: 50 }
                    : table === "daily_goals"
                      ? (options.goal ?? null)
                      : null,
              count: table === "user_achievements" ? 3 : null,
              error: null,
            };
      const chain: Record<string, unknown> = {};
      for (const method of [
        "select",
        "eq",
        "not",
        "gte",
        "lte",
        "order",
        "range",
        "abortSignal",
        "single",
        "maybeSingle",
      ]) {
        chain[method] = (...args: unknown[]) => {
          filters.push([table, method, ...args]);
          return chain;
        };
      }
      chain.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve(result()).then(resolve);
      return chain;
    }),
  };
  return { client: client as unknown as SupabaseClient<Database>, filters, rpc: client.rpc };
}

describe("profile progress data", () => {
  it("uses the saved goal before the first XP and filters all personal queries by user", async () => {
    const { client, filters } = fakeClient();
    const result = await loadProfileProgress(client, "learner", new Date("2026-10-02T02:00:00Z"));
    expect(result).toMatchObject({ dailyXp: 0, dailyTarget: 50, achievements: 3 });
    expect(filters).toContainEqual(["profiles", "eq", "id", "learner"]);
    for (const table of ["activity_log", "daily_goals", "user_achievements"]) {
      expect(filters).toContainEqual([table, "eq", "user_id", "learner"]);
    }
    expect(filters).toContainEqual(["daily_goals", "eq", "date", "2026-10-02"]);
  });
  it("paginates activity and uses the server's earned XP", async () => {
    const row = { created_at: "2026-10-02T00:00:00Z" };
    const { client, filters } = fakeClient({
      activityPages: [Array(500).fill(row), [row]],
      goal: { xp_earned: 130, xp_target: 100 },
    });
    const result = await loadProfileProgress(client, "learner", new Date("2026-10-02T12:00:00Z"));
    expect(result.week.reduce((sum, day) => sum + day.count, 0)).toBe(501);
    expect(result).toMatchObject({ dailyXp: 130, dailyTarget: 100 });
    expect(filters).toContainEqual(["activity_log", "range", 500, 999]);
  });
  it("reports a failed request instead of presenting zero progress", async () => {
    await expect(
      loadProfileProgress(fakeClient({ error: "daily_goals" }).client, "learner")
    ).rejects.toThrow("Offline");
  });
  it("saves goals through the existing RPC and rejects invalid input", async () => {
    const { client, rpc } = fakeClient();
    await expect(saveDailyGoal(client, 50)).resolves.toBe(50);
    expect(rpc).toHaveBeenCalledWith("set_daily_xp_goal", { p_goal: 50 });
    for (const goal of [0, 9, 1001, 25.5, NaN])
      await expect(saveDailyGoal(client, goal)).rejects.toThrow();
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("does not report a goal as saved when the server rejects it", async () => {
    const { client, rpc } = fakeClient();
    rpc.mockResolvedValue({ data: null, error: new Error("Offline") });
    await expect(saveDailyGoal(client, 50)).rejects.toThrow("Offline");
  });
});
