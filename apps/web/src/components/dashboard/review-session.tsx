"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Eye, RotateCcw, Sparkles, Volume2, X, Zap } from "lucide-react";
import { createXpAttemptKey } from "@japangolearn/content";
import type { GradedAnswer, MasteryItemType } from "@japangolearn/core";
import type { ReviewItem } from "@/lib/reviews";

const TYPE_LABEL: Record<MasteryItemType, string> = {
  vocabulary: "Vocabulary",
  kana: "Kana",
  kanji: "Kanji",
  grammar: "Grammar",
};

const TYPE_STYLE: Record<MasteryItemType, string> = {
  vocabulary: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  kana: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  kanji: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  grammar: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

type Phase = "prompt" | "revealed" | "done";

/** Grammar prompts are sentences; single characters get the large display size. */
function promptSizeClass(prompt: string) {
  if (prompt.length <= 2) return "text-7xl sm:text-8xl";
  if (prompt.length <= 6) return "text-5xl sm:text-6xl";
  if (prompt.length <= 16) return "text-3xl sm:text-4xl";
  return "text-xl sm:text-2xl";
}

export function ReviewSession({ items }: { items: ReviewItem[] }) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("prompt");
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const answersRef = useRef<GradedAnswer[]>([]);
  const shownAtRef = useRef<number>(Date.now());
  const attemptKeyRef = useRef<string>(createXpAttemptKey());

  const current = items[index];
  const total = items.length;

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.85;
    const japanese = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("ja"));
    if (japanese) utterance.voice = japanese;
    window.speechSynthesis.speak(utterance);
  }, []);

  const reveal = () => {
    setPhase("revealed");
    if (current) speak(current.reading ?? current.prompt);
  };

  const grade = async (isCorrect: boolean) => {
    if (!current || submitting) return;

    answersRef.current.push({
      itemType: current.itemType,
      itemId: current.itemId,
      isCorrect,
      prompt: current.prompt,
      answer: isCorrect ? current.answer : "",
      correctAnswer: current.answer,
      responseMs: Date.now() - shownAtRef.current,
    });

    const nextScore = {
      correct: score.correct + (isCorrect ? 1 : 0),
      total: score.total + 1,
    };
    setScore(nextScore);

    const next = index + 1;
    if (next < total) {
      setIndex(next);
      setPhase("prompt");
      shownAtRef.current = Date.now();
      return;
    }

    /* Last card. The session is only recorded once, at the end, so a learner
       who abandons halfway does not have a partial run rescheduled on them. */
    setPhase("done");
    setSubmitting(true);
    try {
      const { submitReviewSession } = await import("@/app/actions/reviews");
      const result = await submitReviewSession({
        answers: answersRef.current,
        attemptKey: attemptKeyRef.current,
      });
      if (result.ok) {
        setXpAwarded(result.value.xp_awarded);
      } else {
        setSubmitError(result.error.message);
      }
    } catch {
      setSubmitError("Your review could not be saved. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const accuracy = useMemo(
    () => (score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0),
    [score]
  );

  if (phase === "done") {
    return (
      <div className="mx-auto max-w-md px-1 text-center">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8 dark:border-gray-700 dark:bg-gray-800/60">
          <p className="mb-4 text-6xl">{accuracy >= 80 ? "🎉" : accuracy >= 50 ? "💪" : "📚"}</p>
          <h2 className="text-2xl font-bold">Review complete</h2>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {score.correct} of {score.total} recalled · {accuracy}%
          </p>

          {submitting && <p className="mt-4 text-sm text-gray-400">Saving your progress…</p>}

          {xpAwarded !== null && (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-yellow-50 px-3 py-1.5 text-sm font-semibold text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
              <Zap className="h-4 w-4" aria-hidden="true" />+{xpAwarded} XP
            </p>
          )}

          {submitError && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400"
            >
              {submitError}
            </p>
          )}

          <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
            Items you missed come back in a few minutes. The rest are scheduled further out.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="gradient-bg-primary flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white hover:opacity-90"
            >
              Back to dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/dashboard/review"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 py-3 font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Review more
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const progress = (index / total) * 100;

  return (
    <div className="mx-auto max-w-xl px-1">
      {/* Progress */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-500 dark:text-gray-400">
            {index + 1} of {total}
          </span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            {score.correct} recalled
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700"
          role="progressbar"
          aria-valuenow={index}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Review progress"
        >
          <div
            className="gradient-bg-primary h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center sm:p-8 dark:border-gray-700 dark:bg-gray-800/60">
        <div className="mb-5 flex items-center justify-center gap-2">
          <span
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${TYPE_STYLE[current.itemType]}`}
          >
            {TYPE_LABEL[current.itemType]}
          </span>
          <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            Mastery {Math.round(current.masteryScore)}%
          </span>
        </div>

        <p className={`font-jp font-bold break-words ${promptSizeClass(current.prompt)}`} lang="ja">
          {current.prompt}
        </p>

        {phase === "revealed" ? (
          <div className="mt-6 border-t border-gray-100 pt-6 dark:border-gray-700">
            {current.reading && current.reading !== current.prompt && (
              <p className="font-jp mb-2 text-lg text-gray-500 dark:text-gray-400" lang="ja">
                {current.reading}
              </p>
            )}
            <p className="text-xl font-semibold sm:text-2xl">{current.answer}</p>
            <button
              type="button"
              onClick={() => speak(current.reading ?? current.prompt)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              Hear it
            </button>
          </div>
        ) : (
          <p className="mt-6 text-sm text-gray-400 dark:text-gray-500">
            Recall the meaning, then check yourself.
          </p>
        )}
      </div>

      {/* Actions — full-width and thumb-reachable on mobile */}
      <div className="mt-5">
        {phase === "prompt" ? (
          <button
            type="button"
            onClick={reveal}
            className="gradient-bg-primary flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-semibold text-white hover:opacity-90"
          >
            <Eye className="h-5 w-5" aria-hidden="true" />
            Show answer
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void grade(false)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 py-4 text-base font-semibold text-red-600 hover:bg-red-100 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <X className="h-5 w-5" aria-hidden="true" />
              Missed it
            </button>
            <button
              type="button"
              onClick={() => void grade(true)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-green-200 bg-green-50 py-4 text-base font-semibold text-green-700 hover:bg-green-100 dark:border-green-900 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
            >
              <Check className="h-5 w-5" aria-hidden="true" />
              Got it
            </button>
          </div>
        )}
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-gray-400 dark:text-gray-500">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        Answer honestly — the schedule adapts to what you actually remember.
      </p>
    </div>
  );
}
