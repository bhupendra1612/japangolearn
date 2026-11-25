import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@japangolearn/database";
import { homeCacheKey, loadHomeSnapshot, parseHomeSnapshot } from "./home-loader";

function mockClient(overrides: Record<string, unknown> = {}) {
  const results: Record<string, unknown> = {
    daily_goals: { data: null, error: null },
    activity_log: { data: [], error: null },
    profiles: { data: { xp: 200, streak_days: 4, daily_xp_goal: 50 }, error: null },
    ...overrides,
  };
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const from = vi.fn((table: string) => {
    const builder: Record<string, unknown> = {
      then: (resolve: (value: unknown) => void) => Promise.resolve(results[table]).then(resolve),
    };
    for (const method of ["select", "eq", "order", "limit", "abortSignal", "single", "maybeSingle"])
      builder[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return builder;
      };
    return builder;
  });
  return { client: { from } as unknown as SupabaseClient<Database>, calls };
}
describe("home progress loading", () => {
  it("loads the UTC goal and scopes all progress queries to the signed-in account", async () => {
    const { client, calls } = mockClient();
    const signal = new AbortController().signal;
    const result = await loadHomeSnapshot(
      client,
      "learner-a",
      new Date("2026-10-03T01:00:00+05:30"),
      signal
    );
    expect(result).toMatchObject({
      userId: "learner-a",
      day: "2026-10-02",
      xp: 200,
      streak: 4,
      dailyXp: 0,
      dailyTarget: 50,
    });
    expect(calls.filter((c) => c.method === "eq")).toEqual(
      expect.arrayContaining([
        { table: "daily_goals", method: "eq", args: ["user_id", "learner-a"] },
        { table: "daily_goals", method: "eq", args: ["date", "2026-10-02"] },
        { table: "activity_log", method: "eq", args: ["user_id", "learner-a"] },
        { table: "profiles", method: "eq", args: ["id", "learner-a"] },
      ])
    );
    expect(calls.filter((c) => c.method === "abortSignal")).toHaveLength(3);
    expect(calls.find((c) => c.method === "limit")?.args).toEqual([8]);
  });
  it("uses the server's goal and preserves an error instead of fabricating zero progress", async () => {
    const { client } = mockClient({
      daily_goals: { data: { xp_earned: 85, xp_target: 100 }, error: null },
    });
    expect(
      await loadHomeSnapshot(client, "a", new Date(), new AbortController().signal)
    ).toMatchObject({ dailyXp: 85, dailyTarget: 100 });
    const failure = { message: "Network request failed" };
    await expect(
      loadHomeSnapshot(
        mockClient({ activity_log: { data: null, error: failure } }).client,
        "a",
        new Date(),
        new AbortController().signal
      )
    ).rejects.toBe(failure);
  });
  it("rejects another account's or malformed cached snapshot", async () => {
    const snapshot = await loadHomeSnapshot(
      mockClient().client,
      "a",
      new Date(),
      new AbortController().signal
    );
    expect(parseHomeSnapshot(snapshot, "a")).toEqual(snapshot);
    expect(parseHomeSnapshot(snapshot, "b")).toBeNull();
    expect(parseHomeSnapshot({ ...snapshot, dailyTarget: 0 }, "a")).toBeNull();
    expect(parseHomeSnapshot({ ...snapshot, activities: [null] }, "a")).toBeNull();
    expect(parseHomeSnapshot({ ...snapshot, xp: NaN }, "a")).toBeNull();
    expect(homeCacheKey("a")).not.toBe(homeCacheKey("b"));
  });
});
