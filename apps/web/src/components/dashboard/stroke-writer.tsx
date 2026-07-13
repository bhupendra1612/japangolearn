"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import HanziWriter from "hanzi-writer";

interface StrokeWriterProps {
  character: string;
  size?: number;
}

// All single hiragana/katakana characters supported by kana-json CDN
const SINGLE_KANA = new Set([
  // Basic hiragana (46)
  "あ",
  "い",
  "う",
  "え",
  "お",
  "か",
  "き",
  "く",
  "け",
  "こ",
  "さ",
  "し",
  "す",
  "せ",
  "そ",
  "た",
  "ち",
  "つ",
  "て",
  "と",
  "な",
  "に",
  "ぬ",
  "ね",
  "の",
  "は",
  "ひ",
  "ふ",
  "へ",
  "ほ",
  "ま",
  "み",
  "む",
  "め",
  "も",
  "や",
  "ゆ",
  "よ",
  "ら",
  "り",
  "る",
  "れ",
  "ろ",
  "わ",
  "を",
  "ん",
  // Dakuten (20)
  "が",
  "ぎ",
  "ぐ",
  "げ",
  "ご",
  "ざ",
  "じ",
  "ず",
  "ぜ",
  "ぞ",
  "だ",
  "ぢ",
  "づ",
  "で",
  "ど",
  "ば",
  "び",
  "ぶ",
  "べ",
  "ぼ",
  // Handakuten (5)
  "ぱ",
  "ぴ",
  "ぷ",
  "ぺ",
  "ぽ",
  // Basic katakana (46)
  "ア",
  "イ",
  "ウ",
  "エ",
  "オ",
  "カ",
  "キ",
  "ク",
  "ケ",
  "コ",
  "サ",
  "シ",
  "ス",
  "セ",
  "ソ",
  "タ",
  "チ",
  "ツ",
  "テ",
  "ト",
  "ナ",
  "ニ",
  "ヌ",
  "ネ",
  "ノ",
  "ハ",
  "ヒ",
  "フ",
  "ヘ",
  "ホ",
  "マ",
  "ミ",
  "ム",
  "メ",
  "モ",
  "ヤ",
  "ユ",
  "ヨ",
  "ラ",
  "リ",
  "ル",
  "レ",
  "ロ",
  "ワ",
  "ヲ",
  "ン",
]);

/** Check if a character (single or combo) can use HanziWriter */
export function isKanaSupported(char: string): boolean {
  if (SINGLE_KANA.has(char)) return true;
  // Combo: check if every individual character is supported
  if (char.length > 1) {
    return [...char].every((c) => SINGLE_KANA.has(c));
  }
  return false;
}

/* ─── Shared charDataLoader ─── */
function kanaDataLoader(char: string) {
  return fetch(
    `https://cdn.jsdelivr.net/gh/ailectra/kana-json@v0.0.1/data/${encodeURIComponent(char)}.json`
  ).then((res) => {
    if (!res.ok) throw new Error("Not found");
    return res.json();
  });
}

const WRITER_OPTIONS = {
  padding: 10,
  showOutline: true,
  showCharacter: false,
  strokeAnimationSpeed: 1,
  delayBetweenStrokes: 300,
  strokeColor: "#6d28d9",
  outlineColor: "#e2e8f0",
  radicalColor: "#6d28d9",
  highlightColor: "#a78bfa",
  drawingColor: "#6d28d9",
  highlightOnComplete: true,
  charDataLoader: kanaDataLoader,
};

/* ─── Single character writer (internal) ─── */
function SingleWriter({
  character,
  size,
  writerRef,
  onError,
}: {
  character: string;
  size: number;
  writerRef: React.MutableRefObject<HanziWriter | null>;
  onError: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";
    writerRef.current = null;

    try {
      const writer = HanziWriter.create(containerRef.current, character, {
        ...WRITER_OPTIONS,
        width: size,
        height: size,
      });
      writerRef.current = writer;
    } catch {
      onError();
    }

    return () => {
      writerRef.current = null;
    };
  }, [character, size, writerRef, onError]);

  return (
    <div
      className="relative bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-gray-700 overflow-hidden"
      style={{ width: size, height: size }}
    >
      <svg className="absolute inset-0 pointer-events-none opacity-20" width={size} height={size}>
        <line
          x1={size / 2}
          y1={0}
          x2={size / 2}
          y2={size}
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        <line
          x1={0}
          y1={size / 2}
          x2={size}
          y2={size / 2}
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      </svg>
      <div ref={containerRef} />
    </div>
  );
}

/* ─── Main StrokeWriter component ─── */
export function StrokeWriter({ character, size = 200 }: StrokeWriterProps) {
  const isCombo = character.length > 1;
  const chars = isCombo ? [...character] : [character];
  const comboSize = isCombo ? Math.round(size * 0.65) : size;
  const smallSize = isCombo ? Math.round(size * 0.45) : size;

  // Refs for each writer (max 2 for combos)
  const writerRef1 = useRef<HanziWriter | null>(null);
  const writerRef2 = useRef<HanziWriter | null>(null);

  const [mode, setMode] = useState<"idle" | "animating" | "quiz">("idle");
  const [quizResult, setQuizResult] = useState<{ mistakes: number } | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Reset state on character change
  useEffect(() => {
    setMode("idle");
    setQuizResult(null);
    setLoadError(false);
  }, [character]);

  const handleError = useCallback(() => setLoadError(true), []);

  const handleAnimate = useCallback(() => {
    setMode("animating");
    setQuizResult(null);

    const writers = [writerRef1.current, writerRef2.current].filter(Boolean) as HanziWriter[];
    writers.forEach((w) => w.hideCharacter());

    // Animate sequentially: first char → then second char
    if (writers[0]) {
      writers[0].animateCharacter({
        onComplete: () => {
          if (writers[1]) {
            writers[1].animateCharacter({
              onComplete: () => setMode("idle"),
            });
          } else {
            setMode("idle");
          }
        },
      });
    }
  }, []);

  const handleQuiz = useCallback(() => {
    setMode("quiz");
    setQuizResult(null);

    const writers = [writerRef1.current, writerRef2.current].filter(Boolean) as HanziWriter[];
    let totalMistakes = 0;

    // Quiz sequentially
    if (writers[0]) {
      writers[0].quiz({
        onComplete: (s: { totalMistakes: number }) => {
          totalMistakes += s.totalMistakes;
          if (writers[1]) {
            writers[1].quiz({
              onComplete: (s2: { totalMistakes: number }) => {
                totalMistakes += s2.totalMistakes;
                setQuizResult({ mistakes: totalMistakes });
                setMode("idle");
              },
            });
          } else {
            setQuizResult({ mistakes: totalMistakes });
            setMode("idle");
          }
        },
      });
    }
  }, []);

  const handleReset = useCallback(() => {
    [writerRef1.current, writerRef2.current].forEach((w) => {
      if (w) {
        w.hideCharacter();
        w.showOutline();
      }
    });
    setMode("idle");
    setQuizResult(null);
  }, []);

  const handleShowChar = useCallback(() => {
    [writerRef1.current, writerRef2.current].forEach((w) => {
      if (w) w.showCharacter();
    });
    setMode("idle");
  }, []);

  if (loadError) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p className="text-4xl mb-2">⚠️</p>
        <p className="text-sm">Stroke data unavailable for this character.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Writer canvas(es) */}
      <div className={`flex items-end gap-2 ${isCombo ? "justify-center" : ""}`}>
        <SingleWriter
          character={chars[0]}
          size={isCombo ? comboSize : size}
          writerRef={writerRef1}
          onError={handleError}
        />
        {isCombo && chars[1] && (
          <div className="relative">
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 whitespace-nowrap">
              + small
            </span>
            <SingleWriter
              character={chars[1]}
              size={smallSize}
              writerRef={writerRef2}
              onError={handleError}
            />
          </div>
        )}
      </div>

      {/* Combo label */}
      {isCombo && (
        <p className="text-xs text-gray-400">
          <span className="font-jp text-base">{chars[0]}</span> + small{" "}
          <span className="font-jp text-base">{chars[1]}</span> ={" "}
          <span className="font-jp text-base font-bold">{character}</span>
        </p>
      )}

      {/* Quiz result */}
      {quizResult && (
        <div
          className={`text-sm font-medium px-4 py-2 rounded-full ${
            quizResult.mistakes === 0
              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
          }`}
        >
          {quizResult.mistakes === 0
            ? "🎉 Perfect!"
            : `✏️ ${quizResult.mistakes} mistake${quizResult.mistakes > 1 ? "s" : ""}`}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={handleAnimate}
          disabled={mode === "animating"}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <span>▶</span> Animate
        </button>

        <button
          onClick={handleQuiz}
          disabled={mode === "quiz"}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          <span>✏️</span> Practice
        </button>

        <button
          onClick={handleShowChar}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5"
        >
          <span>👁</span> Show
        </button>

        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5"
        >
          <span>🔄</span> Reset
        </button>
      </div>

      {/* Mode indicator */}
      {mode === "quiz" && (
        <p className="text-xs text-blue-500 dark:text-blue-400 animate-pulse">
          Draw each stroke in order...
        </p>
      )}
      {mode === "animating" && (
        <p className="text-xs text-purple-500 dark:text-purple-400 animate-pulse">
          Animating strokes...
        </p>
      )}
    </div>
  );
}
