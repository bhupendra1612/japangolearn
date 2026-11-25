import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PracticeAnswer } from "./kana-practice";
import { saveKanaPractice, saveLearningQuiz } from "./kana-practice-save";

const mocks = vi.hoisted(() => ({ submit: vi.fn(), receipt: vi.fn(), eq: vi.fn() }));
vi.mock("./offline-queue", () => ({ submitLearningAttemptWithQueue: mocks.submit }));
vi.mock("./supabase", () => ({ supabase: { from: () => ({ select: () => ({ eq: mocks.eq }) }) } }));
const answers = [
  {
    itemType: "kana",
    itemId: "1",
    answer: "a",
    correctAnswer: "a",
    isCorrect: true,
    responseMs: 400,
    usedHint: false,
    skipped: false,
  },
] as PracticeAnswer[];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.eq.mockImplementation(() => ({
    eq: mocks.eq,
    abortSignal: () => ({ maybeSingle: mocks.receipt }),
  }));
  mocks.receipt.mockResolvedValue({ data: { amount: 5 }, error: null });
});

describe("kana XP and progress saving", () => {
  it("submits vocabulary through the correct server activity", async () => {
    mocks.submit.mockResolvedValue({ status: "submitted" });
    const vocabularyAnswers = [
      { ...answers[0], itemType: "vocabulary" as const, answer: "School", correctAnswer: "School" },
    ];
    expect(
      await saveLearningQuiz("vocabulary_quiz", "vocab-1", "user-1", vocabularyAnswers)
    ).toEqual({ status: "submitted", xp: 5 });
    expect(mocks.submit.mock.calls[0][1]).toMatchObject({
      activityType: "vocabulary_quiz",
      attemptKey: "vocab-1",
      answers: [{ item_type: "vocabulary", item_id: "1", answer: "School", response_ms: 400 }],
    });
  });
  it("uses the secure queue with a stable attempt key and reads server-awarded XP", async () => {
    mocks.submit.mockResolvedValue({ status: "submitted" });
    expect(await saveKanaPractice("attempt-1", "user-1", answers)).toEqual({
      status: "submitted",
      xp: 5,
    });
    expect(mocks.submit).toHaveBeenCalledWith(expect.anything(), {
      activityType: "writing_quiz",
      attemptKey: "attempt-1",
      expectedUserId: "user-1",
      answers: [{ item_type: "kana", item_id: "1", answer: "a", response_ms: 400 }],
    });
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mocks.eq).toHaveBeenCalledWith("award_key", "quiz:attempt-1");
  });
  it("does not claim XP before an offline attempt syncs", async () => {
    mocks.submit.mockResolvedValue({ status: "queued" });
    expect(await saveKanaPractice("attempt-1", "user-1", answers)).toEqual({ status: "queued" });
    expect(mocks.receipt).not.toHaveBeenCalled();
  });
  it("does not award XP again for a mistake-only review or a guest", async () => {
    expect(await saveKanaPractice("review-1", "user-1", answers, true)).toEqual({
      status: "review",
    });
    expect(await saveKanaPractice("guest-1", undefined, answers)).toEqual({ status: "guest" });
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("retains saved status if the optional XP receipt cannot be read", async () => {
    mocks.submit.mockResolvedValue({ status: "submitted" });
    mocks.receipt.mockResolvedValue({ data: null, error: new Error("Network failed") });
    expect(await saveKanaPractice("attempt-1", "user-1", answers)).toEqual({
      status: "submitted",
      xp: null,
    });
  });
  it("shows submission failures instead of claiming the score was saved", async () => {
    mocks.submit.mockResolvedValue({ status: "failed", error: new Error("Daily XP limit") });
    expect((await saveKanaPractice("attempt-1", "user-1", answers)).status).toBe("failed");
  });
});
