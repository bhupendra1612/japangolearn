import {
  N5_MOCKS,
  getExamDefinition,
  type ExamDefinition,
  type ExamQuestion,
  type ExamSectionId,
} from "./exam-content";
import type { ExamAttemptRecord } from "./exam-engine";

export type ReadinessBand = "unmeasured" | "foundation" | "developing" | "nearly-ready" | "strong";

export type SectionReadiness = {
  sectionId: ExamSectionId;
  title: string;
  score: number | null;
  correctAnswers: number;
  totalQuestions: number;
  attemptCount: number;
};

export type SkillReadiness = {
  skill: string;
  sectionId: ExamSectionId;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
};

export type MockCoverage = {
  examId: string;
  title: string;
  attempted: boolean;
  attemptCount: number;
  latestScore: number | null;
  bestScore: number | null;
};

export type StudyRecommendation = {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  icon: "analytics" | "book" | "headset" | "refresh" | "rocket";
};

export type ReadinessReport = {
  score: number | null;
  band: ReadinessBand;
  label: string;
  confidence: "No data" | "Low" | "Medium" | "High";
  confidencePercent: number;
  trendDelta: number | null;
  fullAttemptCount: number;
  totalAttemptCount: number;
  coveredMockCount: number;
  totalMockCount: number;
  sections: SectionReadiness[];
  skills: SkillReadiness[];
  coverage: MockCoverage[];
  recommendations: StudyRecommendation[];
};

const RECENCY_WEIGHTS = [1, 0.86, 0.74, 0.64, 0.56, 0.5];

function percentage(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}

function weightedAverage(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  let weightedTotal = 0;
  let totalWeight = 0;
  values.slice(0, RECENCY_WEIGHTS.length).forEach((value, index) => {
    const weight = RECENCY_WEIGHTS[index] ?? RECENCY_WEIGHTS.at(-1) ?? 0.5;
    weightedTotal += value * weight;
    totalWeight += weight;
  });
  return Math.round(weightedTotal / totalWeight);
}

function bandForScore(score: number | null): Pick<ReadinessReport, "band" | "label"> {
  if (score === null) return { band: "unmeasured", label: "Take a baseline mock" };
  if (score >= 85) return { band: "strong", label: "Strong practice readiness" };
  if (score >= 70) return { band: "nearly-ready", label: "Nearly ready" };
  if (score >= 50) return { band: "developing", label: "Developing steadily" };
  return { band: "foundation", label: "Build the foundation" };
}

function resolveAttemptQuestions(
  attempt: ExamAttemptRecord,
  exam: ExamDefinition
): readonly ExamQuestion[] {
  if (attempt.mode === "full") return exam.sections.flatMap((section) => section.questions);
  return (
    exam.sections.find((section) => section.id === attempt.sectionId)?.questions ?? []
  );
}

function sectionHref(examId: string, sectionId: ExamSectionId): string {
  return `/exam/run?mode=section&examId=${encodeURIComponent(examId)}&section=${sectionId}`;
}

function fullHref(examId: string): string {
  return `/exam/run?mode=full&examId=${encodeURIComponent(examId)}`;
}

export function buildReadinessReport(
  attempts: readonly ExamAttemptRecord[],
  exams: readonly ExamDefinition[] = N5_MOCKS
): ReadinessReport {
  const knownExamIds = new Set(exams.map((exam) => exam.id));
  const ordered = attempts
    .filter((attempt) => knownExamIds.has(attempt.examId) && attempt.totalQuestions > 0)
    .slice()
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
  const fullAttempts = ordered.filter((attempt) => attempt.mode === "full");

  const sections: SectionReadiness[] = exams[0].sections.map((section) => {
    const matching = ordered.flatMap((attempt) =>
      attempt.sectionResults.filter((result) => result.sectionId === section.id)
    );
    const correctAnswers = matching.reduce((sum, result) => sum + result.correctAnswers, 0);
    const totalQuestions = matching.reduce((sum, result) => sum + result.totalQuestions, 0);
    return {
      sectionId: section.id,
      title: section.title,
      score: matching.length === 0 ? null : percentage(correctAnswers, totalQuestions),
      correctAnswers,
      totalQuestions,
      attemptCount: matching.length,
    };
  });

  const skillTotals = new Map<
    string,
    { skill: string; sectionId: ExamSectionId; correctAnswers: number; totalQuestions: number }
  >();
  for (const attempt of ordered) {
    const exam = getExamDefinition(attempt.examId) ?? exams.find((item) => item.id === attempt.examId);
    if (!exam) continue;
    for (const question of resolveAttemptQuestions(attempt, exam)) {
      const key = `${question.sectionId}:${question.skill}`;
      const current = skillTotals.get(key) ?? {
        skill: question.skill,
        sectionId: question.sectionId,
        correctAnswers: 0,
        totalQuestions: 0,
      };
      current.totalQuestions += 1;
      if (attempt.answers[question.id] === question.correctChoice) current.correctAnswers += 1;
      skillTotals.set(key, current);
    }
  }
  const skills: SkillReadiness[] = [...skillTotals.values()]
    .map((skill) => ({ ...skill, score: percentage(skill.correctAnswers, skill.totalQuestions) }))
    .sort((a, b) => a.score - b.score || b.totalQuestions - a.totalQuestions);

  const coverage: MockCoverage[] = exams.map((exam) => {
    const examAttempts = fullAttempts.filter((attempt) => attempt.examId === exam.id);
    return {
      examId: exam.id,
      title: exam.title,
      attempted: examAttempts.length > 0,
      attemptCount: examAttempts.length,
      latestScore: examAttempts[0]?.rawScorePercent ?? null,
      bestScore:
        examAttempts.length === 0
          ? null
          : Math.max(...examAttempts.map((attempt) => attempt.rawScorePercent)),
    };
  });

  const sectionScores = sections
    .map((section) => section.score)
    .filter((score): score is number => score !== null);
  const score =
    weightedAverage(fullAttempts.map((attempt) => attempt.rawScorePercent)) ??
    (sectionScores.length === 0
      ? null
      : Math.round(sectionScores.reduce((sum, value) => sum + value, 0) / sectionScores.length));
  const band = bandForScore(score);

  const latestWindow = fullAttempts.slice(0, 3).map((attempt) => attempt.rawScorePercent);
  const previousWindow = fullAttempts.slice(3, 6).map((attempt) => attempt.rawScorePercent);
  const latestAverage = weightedAverage(latestWindow);
  const previousAverage = weightedAverage(previousWindow);
  const trendDelta =
    latestAverage === null || previousAverage === null ? null : latestAverage - previousAverage;

  const coveredMockCount = coverage.filter((item) => item.attempted).length;
  const confidencePercent = Math.min(
    100,
    ordered.length * 9 + fullAttempts.length * 12 + coveredMockCount * 12
  );
  const confidence: ReadinessReport["confidence"] =
    confidencePercent === 0
      ? "No data"
      : confidencePercent >= 75
        ? "High"
        : confidencePercent >= 40
          ? "Medium"
          : "Low";

  const recommendations: StudyRecommendation[] = [];
  const unattemptedMock = coverage.find((item) => !item.attempted);
  const targetExamId = unattemptedMock?.examId ?? coverage[0]?.examId ?? exams[0].id;

  if (ordered.length === 0) {
    recommendations.push({
      id: "baseline",
      title: "Take your baseline mock",
      description: "Complete Mock 1 so JapanGoLearn can measure each section and tailor your plan.",
      actionLabel: "Start Mock 1",
      href: fullHref(exams[0].id),
      icon: "rocket",
    });
  } else {
    const weakestSection = sections
      .filter((section): section is SectionReadiness & { score: number } => section.score !== null)
      .sort((a, b) => a.score - b.score)[0];
    if (weakestSection && weakestSection.score < 80) {
      recommendations.push({
        id: `section-${weakestSection.sectionId}`,
        title: `Strengthen ${weakestSection.title}`,
        description: `Your current section accuracy is ${weakestSection.score}%. A focused timed section is the fastest next step.`,
        actionLabel: "Practise section",
        href: sectionHref(targetExamId, weakestSection.sectionId),
        icon: weakestSection.sectionId === "listening" ? "headset" : "book",
      });
    }

    const weakestSkill = skills.find((skill) => skill.totalQuestions >= 2 && skill.score < 75);
    if (weakestSkill) {
      recommendations.push({
        id: `skill-${weakestSkill.sectionId}-${weakestSkill.skill}`,
        title: `Review ${weakestSkill.skill}`,
        description: `${weakestSkill.correctAnswers} of ${weakestSkill.totalQuestions} answered correctly. Use the next section set to rebuild this skill.`,
        actionLabel: "Start targeted practice",
        href: sectionHref(targetExamId, weakestSkill.sectionId),
        icon: weakestSkill.sectionId === "listening" ? "headset" : "analytics",
      });
    }

    if (unattemptedMock) {
      recommendations.push({
        id: `coverage-${unattemptedMock.examId}`,
        title: `Complete ${unattemptedMock.title.replace("JapanGoLearn ", "")}`,
        description: "A fresh full set gives a more reliable readiness estimate and prevents memorised answers from inflating it.",
        actionLabel: "Start full mock",
        href: fullHref(unattemptedMock.examId),
        icon: "rocket",
      });
    } else if (trendDelta !== null && trendDelta <= -5) {
      const latest = fullAttempts[0];
      recommendations.push({
        id: "trend-recovery",
        title: "Recover your recent trend",
        description: `Your recent full-mock average is ${Math.abs(trendDelta)} points lower. Review mistakes, then retake the latest set.`,
        actionLabel: "Retake latest mock",
        href: fullHref(latest.examId),
        icon: "refresh",
      });
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "maintain",
      title: "Maintain exam rhythm",
      description: "Your section balance is strong. Schedule another timed mock to keep speed and concentration sharp.",
      actionLabel: "Start a full mock",
      href: fullHref(coverage[0]?.examId ?? exams[0].id),
      icon: "refresh",
    });
  }

  return {
    score,
    ...band,
    confidence,
    confidencePercent,
    trendDelta,
    fullAttemptCount: fullAttempts.length,
    totalAttemptCount: ordered.length,
    coveredMockCount,
    totalMockCount: exams.length,
    sections,
    skills,
    coverage,
    recommendations: recommendations.slice(0, 3),
  };
}
