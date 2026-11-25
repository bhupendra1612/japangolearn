import { describe, expect, it } from "vitest";
import {
  getListeningPracticeItemId,
  getListeningQuestionByPracticeItemId,
  N5_MOCK_1,
  N5_MOCKS,
} from "./exam-content";
import { calculateAttemptResult, formatTimer } from "./exam-engine";

describe("exam engine", () => {
  it("formats section timers without going below zero", () => {
    expect(formatTimer(1200)).toBe("20:00");
    expect(formatTimer(65)).toBe("01:05");
    expect(formatTimer(-1)).toBe("00:00");
  });

  it("calculates overall and per-section raw scores", () => {
    const selectedSections = N5_MOCK_1.sections.slice(0, 2);
    const answers = Object.fromEntries(
      selectedSections.flatMap((section) =>
        section.questions.map((question, index) => [
          question.id,
          index === 0
            ? question.correctChoice
            : (question.correctChoice + 1) % question.choices.length,
        ])
      )
    );
    const result = calculateAttemptResult(selectedSections, answers);

    expect(result.correctAnswers).toBe(2);
    expect(result.totalQuestions).toBe(16);
    expect(result.rawScorePercent).toBe(13);
    expect(result.sectionResults).toHaveLength(2);
    expect(result.sectionResults[0]?.correctAnswers).toBe(1);
  });

  it("contains unique question identifiers and valid answer indexes", () => {
    const questions = N5_MOCKS.flatMap((exam) =>
      exam.sections.flatMap((section) => section.questions)
    );
    expect(new Set(questions.map((question) => question.id)).size).toBe(questions.length);
    expect(questions).toHaveLength(108);
    for (const question of questions) {
      expect(question.correctChoice).toBeGreaterThanOrEqual(0);
      expect(question.correctChoice).toBeLessThan(question.choices.length);
      expect(question.explanation).toBeTruthy();
    }
  });

  it("maps every listening question to a stable practice-list item", () => {
    const listening = N5_MOCKS.flatMap(
      (exam) => exam.sections.find((section) => section.id === "listening")?.questions ?? []
    );
    expect(listening).toHaveLength(60);
    for (const question of listening) {
      const itemId = getListeningPracticeItemId(question.id);
      expect(itemId).toBeTypeOf("number");
      expect(getListeningQuestionByPracticeItemId(itemId!)).toEqual(question);
      expect(question.audioScript).toBeTruthy();
      expect(question.explanation).toBeTruthy();
    }
  });
});
