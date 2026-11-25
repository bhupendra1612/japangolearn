import { describe, expect, it } from "vitest";
import {
  activityAge,
  activityStudyArea,
  continueStudyArea,
  dailyKanji,
  goalProgress,
  parseStudyMinutes,
  studyPlan,
  type HomeActivity,
} from "./home-study";
import { prepareKanji } from "./kanji-study";

const activity = (type: string, metadata: HomeActivity["metadata"] = null): HomeActivity => ({
  id: type,
  type,
  title: type,
  created_at: "2026-10-02T20:00:00Z",
  xp_earned: 10,
  metadata,
});
describe("home study guidance", () => {
  it("continues the newest supported subject, skipping unrelated activity", () => {
    expect(
      continueStudyArea([
        activity("achievement"),
        activity("xp", { activity_type: "kanji_quiz" }),
        activity("grammar"),
      ])
    ).toBe("kanji");
    expect(continueStudyArea([activity("xp")])).toBeNull();
    expect(activityStudyArea(activity("writing"))).toBe("writing");
    expect(activityStudyArea(activity("xp", { activity_type: "kana_quiz" }))).toBe("writing");
  });
  it("does not trust arbitrary routes or malformed metadata", () => {
    for (const value of ["https://example.com", "/profile", "kanjievil", "exam"])
      expect(activityStudyArea(activity(value))).toBeNull();
    expect(activityStudyArea(activity("grammar", []))).toBe("grammar");
    expect(activityStudyArea(activity("kanji", { activity_type: 17 }))).toBe("kanji");
  });
  it("builds balanced plans whose estimated minutes match the selection", () => {
    for (const minutes of [5, 10, 15] as const) {
      const plan = studyPlan(minutes);
      expect(plan.reduce((sum, step) => sum + step.minutes, 0)).toBe(minutes);
      expect(new Set(plan.map((step) => step.area)).size).toBe(plan.length);
    }
    expect(parseStudyMinutes(15)).toBe(15);
    expect(parseStudyMinutes("5")).toBe(10);
    expect(parseStudyMinutes(null)).toBe(10);
  });
  it("uses the same local-day kanji selection as the Kanji library", () => {
    const rows = prepareKanji(
      [1, 2, 3].map((id) => ({ id, character: String(id), meaning_en: ["Example"] }))
    );
    const date = new Date(2026, 9, 3, 1);
    const index = Math.floor(Date.UTC(2026, 9, 3) / 86_400_000) % rows.length;
    expect(dailyKanji(rows, date)).toBe(rows[index]);
    expect(dailyKanji(rows, new Date(2026, 9, 3, 23))).toBe(rows[index]);
    expect(dailyKanji([], date)).toBeUndefined();
  });
  it("bounds progress safely, including a zero or corrupt target", () => {
    expect(goalProgress(150, 100)).toMatchObject({ ratio: 1, remaining: 0 });
    expect(goalProgress(20, 50)).toMatchObject({ ratio: 0.4, remaining: 30 });
    expect(goalProgress(-2, 0)).toMatchObject({ earned: 0, target: 100, ratio: 0 });
    expect(goalProgress(NaN, Infinity)).toMatchObject({ earned: 0, target: 100 });
  });
  it("keeps relative dates valid for bad timestamps and clock skew", () => {
    const now = new Date("2026-10-03T00:00:00Z");
    expect(activityAge("2026-10-02T23:30:00Z", now)).toBe("30m ago");
    expect(activityAge("2026-10-02T00:00:00Z", now)).toBe("Yesterday");
    expect(activityAge("2026-10-04T00:00:00Z", now)).toBe("Just now");
    expect(activityAge("broken", now)).toBe("Recent activity");
  });
});
