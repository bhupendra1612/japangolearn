import type { ExamQuestion, ExamSection, ExamSectionId } from "./exam-content";

export type ExamMode = "full" | "section";
export type ExamAnswerMap = Record<string, number>;

export type SectionResult = {
  sectionId: ExamSectionId;
  title: string;
  correctAnswers: number;
  totalQuestions: number;
  rawScorePercent: number;
};

export type ExamAttemptRecord = {
  id: string;
  examId: string;
  examTitle: string;
  mode: ExamMode;
  sectionId: ExamSectionId | null;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  correctAnswers: number;
  totalQuestions: number;
  rawScorePercent: number;
  answers: ExamAnswerMap;
  sectionResults: SectionResult[];
  syncedAt: string | null;
};

export function formatTimer(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function scoreQuestions(questions: readonly ExamQuestion[], answers: ExamAnswerMap): number {
  return questions.reduce(
    (correct, question) => correct + (answers[question.id] === question.correctChoice ? 1 : 0),
    0
  );
}

export function calculateAttemptResult(
  sections: readonly ExamSection[],
  answers: ExamAnswerMap
): Pick<
  ExamAttemptRecord,
  "correctAnswers" | "totalQuestions" | "rawScorePercent" | "sectionResults"
> {
  const sectionResults = sections.map((section) => {
    const correctAnswers = scoreQuestions(section.questions, answers);
    const totalQuestions = section.questions.length;
    return {
      sectionId: section.id,
      title: section.title,
      correctAnswers,
      totalQuestions,
      rawScorePercent:
        totalQuestions === 0 ? 0 : Math.round((correctAnswers / totalQuestions) * 100),
    };
  });
  const correctAnswers = sectionResults.reduce((sum, result) => sum + result.correctAnswers, 0);
  const totalQuestions = sectionResults.reduce((sum, result) => sum + result.totalQuestions, 0);

  return {
    correctAnswers,
    totalQuestions,
    rawScorePercent: totalQuestions === 0 ? 0 : Math.round((correctAnswers / totalQuestions) * 100),
    sectionResults,
  };
}

export function createClientUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function getReadinessLabel(rawScorePercent: number): string {
  if (rawScorePercent >= 80) return "Strong practice result";
  if (rawScorePercent >= 60) return "Building confidence";
  return "Keep practising";
}
