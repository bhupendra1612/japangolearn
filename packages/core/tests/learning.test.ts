import { describe, expect, it } from "vitest";
import { calculateQuizScore, calculateStreak, getXpLevelProgress } from "../src";

describe("quiz scoring and XP", () => {
  it("awards the configured XP per correct answer", () => {
    expect(calculateQuizScore("vocabulary_quiz", 8, 10)).toEqual({
      correctAnswers: 8,
      totalQuestions: 10,
      accuracyPercent: 80,
      xpAwarded: 40,
    });
    expect(calculateQuizScore("practice_quiz", 3, 5).xpAwarded).toBe(30);
  });

  it("records a valid zero score without awarding XP", () => {
    expect(calculateQuizScore("grammar_quiz", 0, 10).xpAwarded).toBe(0);
  });

  it("rejects impossible scores", () => {
    expect(() => calculateQuizScore("writing_quiz", 11, 10)).toThrow(RangeError);
    expect(() => calculateQuizScore("writing_quiz", -1, 10)).toThrow(RangeError);
    expect(() => calculateQuizScore("writing_quiz", 0, 0)).toThrow(RangeError);
  });
});

describe("XP levels", () => {
  it("keeps XP within the current level", () => {
    expect(getXpLevelProgress(0)).toMatchObject({ level: 1, current: 0, needed: 100 });
    expect(getXpLevelProgress(99)).toMatchObject({ level: 1, current: 99, remaining: 1 });
    expect(getXpLevelProgress(100)).toMatchObject({ level: 2, current: 0, needed: 200 });
    expect(getXpLevelProgress(350)).toMatchObject({ level: 3, current: 50, needed: 300 });
  });

  it("normalizes invalid and negative totals", () => {
    expect(getXpLevelProgress(-200).current).toBe(0);
    expect(getXpLevelProgress(Number.NaN).level).toBe(1);
  });
});

describe("streaks", () => {
  it("starts, preserves, increments and resets a streak", () => {
    expect(
      calculateStreak({
        currentStreak: 0,
        longestStreak: 0,
        lastPracticeDate: null,
        practiceDate: "2026-07-16",
      })
    ).toEqual({ currentStreak: 1, longestStreak: 1 });

    expect(
      calculateStreak({
        currentStreak: 4,
        longestStreak: 7,
        lastPracticeDate: "2026-07-16",
        practiceDate: "2026-07-16",
      })
    ).toEqual({ currentStreak: 4, longestStreak: 7 });

    expect(
      calculateStreak({
        currentStreak: 4,
        longestStreak: 7,
        lastPracticeDate: "2026-07-15",
        practiceDate: "2026-07-16",
      })
    ).toEqual({ currentStreak: 5, longestStreak: 7 });

    expect(
      calculateStreak({
        currentStreak: 4,
        longestStreak: 7,
        lastPracticeDate: "2026-07-12",
        practiceDate: "2026-07-16",
      })
    ).toEqual({ currentStreak: 1, longestStreak: 7 });
  });
});
