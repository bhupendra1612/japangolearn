import { describe, expect, it } from "vitest";
import { N5_MOCKS, type ExamDefinition } from "./exam-content";
import { calculateAttemptResult, type ExamAnswerMap, type ExamAttemptRecord } from "./exam-engine";
import { buildReadinessReport } from "./exam-readiness";

function createAttempt(
  exam: ExamDefinition,
  id: string,
  completedAt: string,
  answerRule: (sectionId: string, questionIndex: number) => boolean
): ExamAttemptRecord {
  const answers: ExamAnswerMap = {};
  for (const section of exam.sections) {
    section.questions.forEach((question, index) => {
      answers[question.id] = answerRule(section.id, index)
        ? question.correctChoice
        : (question.correctChoice + 1) % question.choices.length;
    });
  }
  const result = calculateAttemptResult(exam.sections, answers);
  return {
    id,
    examId: exam.id,
    examTitle: exam.title,
    mode: "full",
    sectionId: null,
    startedAt: completedAt,
    completedAt,
    durationSeconds: 4_500,
    ...result,
    answers,
    syncedAt: null,
  };
}

describe("exam readiness", () => {
  it("starts with an unmeasured baseline recommendation", () => {
    const report = buildReadinessReport([]);

    expect(report.score).toBeNull();
    expect(report.band).toBe("unmeasured");
    expect(report.confidence).toBe("No data");
    expect(report.recommendations[0]?.id).toBe("baseline");
    expect(report.recommendations[0]?.href).toContain(N5_MOCKS[0].id);
  });

  it("identifies listening as the weakest section and recommends focused practice", () => {
    const attempt = createAttempt(
      N5_MOCKS[0],
      "weak-listening",
      "2026-09-22T10:00:00.000Z",
      (sectionId) => sectionId !== "listening"
    );
    const report = buildReadinessReport([attempt]);
    const listening = report.sections.find((section) => section.sectionId === "listening");

    expect(listening?.score).toBe(0);
    expect(report.recommendations[0]?.id).toBe("section-listening");
    expect(report.recommendations[0]?.href).toContain("section=listening");
    expect(report.skills[0]?.score).toBe(0);
  });

  it("tracks coverage and gives more weight to recent full mocks", () => {
    const attempts = N5_MOCKS.map((exam, index) =>
      createAttempt(
        exam,
        `coverage-${index}`,
        `2026-09-${20 + index}T10:00:00.000Z`,
        (_sectionId, questionIndex) => questionIndex < 6
      )
    );
    const report = buildReadinessReport(attempts);

    expect(report.coveredMockCount).toBe(3);
    expect(report.coverage.every((mock) => mock.attempted)).toBe(true);
    expect(report.fullAttemptCount).toBe(3);
    expect(report.score).not.toBeNull();
    expect(report.confidencePercent).toBeGreaterThanOrEqual(75);
  });

  it("compares the latest three full mocks with the previous three", () => {
    const exam = N5_MOCKS[0];
    const attempts = Array.from({ length: 6 }, (_, index) =>
      createAttempt(
        exam,
        `trend-${index}`,
        `2026-09-${10 + index}T10:00:00.000Z`,
        (_sectionId, questionIndex) => questionIndex < (index >= 3 ? 7 : 2)
      )
    );
    const report = buildReadinessReport(attempts);

    expect(report.trendDelta).not.toBeNull();
    expect(report.trendDelta!).toBeGreaterThan(0);
  });
});
