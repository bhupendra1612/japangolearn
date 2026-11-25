import "expo-sqlite/localStorage/install";
import type { Database, Json } from "@japangolearn/database";
import { supabase } from "./supabase";
import type { ExamAttemptRecord, SectionResult } from "./exam-engine";

type MockAttemptRow = Database["public"]["Tables"]["mock_exam_attempts"]["Row"];

const MAX_LOCAL_ATTEMPTS = 50;

function storageKey(userId?: string | null): string {
  return `jgl:exam-attempts:v1:${userId ?? "guest"}`;
}

function readLocalAttempts(userId?: string | null): ExamAttemptRecord[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ExamAttemptRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalAttempts(
  userId: string | null | undefined,
  attempts: ExamAttemptRecord[]
): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(attempts.slice(0, MAX_LOCAL_ATTEMPTS)));
}

function upsertLocalAttempt(userId: string | null | undefined, attempt: ExamAttemptRecord): void {
  const attempts = readLocalAttempts(userId).filter((item) => item.id !== attempt.id);
  attempts.unshift(attempt);
  attempts.sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
  writeLocalAttempts(userId, attempts);
}

function fromRemote(row: MockAttemptRow): ExamAttemptRecord {
  return {
    id: row.id,
    examId: row.exam_id,
    examTitle: row.exam_title,
    mode: row.mode as ExamAttemptRecord["mode"],
    sectionId: row.section_id as ExamAttemptRecord["sectionId"],
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationSeconds: row.duration_seconds,
    correctAnswers: row.correct_answers,
    totalQuestions: row.total_questions,
    rawScorePercent: row.raw_score_percent,
    answers: row.answers as ExamAttemptRecord["answers"],
    sectionResults: row.section_results as unknown as SectionResult[],
    syncedAt: row.created_at,
  };
}

export function getLocalAttempt(
  attemptId: string,
  userId?: string | null
): ExamAttemptRecord | undefined {
  return readLocalAttempts(userId).find((attempt) => attempt.id === attemptId);
}

export async function saveExamAttempt(
  attempt: ExamAttemptRecord,
  userId?: string | null
): Promise<ExamAttemptRecord> {
  upsertLocalAttempt(userId, attempt);
  if (!userId) return attempt;

  const { error } = await supabase.from("mock_exam_attempts").upsert({
    id: attempt.id,
    user_id: userId,
    exam_id: attempt.examId,
    exam_title: attempt.examTitle,
    mode: attempt.mode,
    section_id: attempt.sectionId,
    started_at: attempt.startedAt,
    completed_at: attempt.completedAt,
    duration_seconds: attempt.durationSeconds,
    correct_answers: attempt.correctAnswers,
    total_questions: attempt.totalQuestions,
    raw_score_percent: attempt.rawScorePercent,
    answers: attempt.answers as Json,
    section_results: attempt.sectionResults as unknown as Json,
  });

  if (error) return attempt;

  const syncedAttempt = { ...attempt, syncedAt: new Date().toISOString() };
  upsertLocalAttempt(userId, syncedAttempt);
  return syncedAttempt;
}

export async function loadExamAttempts(userId?: string | null): Promise<ExamAttemptRecord[]> {
  const localAttempts = readLocalAttempts(userId);
  if (!userId) return localAttempts;

  const { data, error } = await supabase
    .from("mock_exam_attempts")
    .select("*")
    .order("completed_at", { ascending: false })
    .limit(MAX_LOCAL_ATTEMPTS);

  if (error || !data) return localAttempts;

  const merged = new Map<string, ExamAttemptRecord>();
  for (const attempt of localAttempts) merged.set(attempt.id, attempt);
  for (const row of data) merged.set(row.id, fromRemote(row));
  const attempts = [...merged.values()].sort(
    (a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt)
  );
  writeLocalAttempts(userId, attempts);
  return attempts;
}
