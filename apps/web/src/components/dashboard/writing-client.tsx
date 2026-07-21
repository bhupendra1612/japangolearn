"use client";

import { useState, useCallback } from "react";
import { Volume2, Eye, EyeOff, ArrowRight, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { StrokeWriter, isKanaSupported } from "./stroke-writer";
import { createXpAttemptKey } from "@japangolearn/content";

interface Kana {
  id: number;
  character: string;
  romaji: string;
  romaji_hindi: string | null;
  type: string;
  group_name: string;
  stroke_count: number;
  stroke_hint: string | null;
  sort_order: number;
  icon: string | null;
}

/* ─── Advanced SVG stroke paths for vowels ─── */
/* Character bounding box in 109×109 viewBox:                     */
/* Ghost text: x=54.5 y=82 fontSize=76px → char sits ~(18,16)→(91,88) */
interface StrokeData {
  paths: string[];
  strokeColors: string[];
}

const STROKE_PATHS: Record<string, StrokeData> = {
  /* あ — 3 strokes */
  あ: {
    paths: [
      // Stroke 1: horizontal sweep across upper third
      "M 24,38 C 36,34 58,32 80,36",
      // Stroke 2: vertical from top going down through horizontal
      "M 56,18 C 57,30 56,48 50,72 C 48,78 46,82 44,84",
      // Stroke 3: sweeping curve from intersection, down-left, then right
      "M 46,46 C 36,54 22,66 24,74 C 26,82 40,80 54,72 C 68,64 78,58 80,62 C 82,66 78,74 74,78",
    ],
    strokeColors: ["#ef4444", "#3b82f6", "#10b981"],
  },
  /* い — 2 strokes */
  い: {
    paths: [
      // Stroke 1: left stroke curving slightly left
      "M 34,28 C 32,36 28,48 24,60 C 22,66 20,70 20,72",
      // Stroke 2: right stroke curving slightly right
      "M 68,26 C 66,38 64,50 66,64 C 68,72 70,78 74,82",
    ],
    strokeColors: ["#ef4444", "#3b82f6"],
  },
  /* う — 2 strokes */
  う: {
    paths: [
      // Stroke 1: small tick/dash at the top
      "M 44,22 C 48,20 56,20 60,24",
      // Stroke 2: large open curve forming the body
      "M 56,34 C 64,40 70,50 68,62 C 66,72 56,80 44,82 C 34,82 26,76 24,68",
    ],
    strokeColors: ["#ef4444", "#3b82f6"],
  },
  /* え — 2 strokes */
  え: {
    paths: [
      // Stroke 1: short hook at top-center
      "M 36,24 C 44,20 56,20 62,28",
      // Stroke 2: main body — horizontal then angular sweep down-right
      "M 24,46 C 36,44 56,42 72,46 C 60,54 46,64 48,72 C 50,80 62,82 74,78 C 80,76 84,72 86,70",
    ],
    strokeColors: ["#ef4444", "#3b82f6"],
  },
  /* お — 3 strokes */
  お: {
    paths: [
      // Stroke 1: horizontal stroke across upper area
      "M 22,38 C 36,34 54,32 78,36",
      // Stroke 2: vertical from top down, slightly curved left at bottom
      "M 40,18 C 40,30 40,46 38,60 C 36,70 34,78 32,82",
      // Stroke 3: loop/circle on the right side
      "M 58,44 C 68,46 76,54 74,64 C 72,74 62,78 54,74 C 48,70 48,62 52,56",
    ],
    strokeColors: ["#ef4444", "#3b82f6", "#10b981"],
  },
};

void STROKE_PATHS;

const GROUP_COLORS: Record<string, string> = {
  "Vowels (あ行)": "border-l-violet-500",
  "K-row (か行)": "border-l-blue-500",
  "S-row (さ行)": "border-l-teal-500",
  "T-row (た行)": "border-l-green-500",
  "N-row (な行)": "border-l-emerald-500",
  "H-row (は行)": "border-l-amber-500",
  "M-row (ま行)": "border-l-orange-500",
  "Y-row (や行)": "border-l-red-400",
  "R-row (ら行)": "border-l-pink-500",
  "W-row (わ行)": "border-l-rose-500",
  "N (ん)": "border-l-purple-500",
  "G-row (が行)": "border-l-sky-500",
  "Z-row (ざ行)": "border-l-indigo-500",
  "D-row (だ行)": "border-l-cyan-500",
  "B-row (ば行)": "border-l-fuchsia-500",
  "P-row (ぱ行)": "border-l-lime-500",
  "Combo (拗音)": "border-l-yellow-500",
};

type ViewMode = "grid" | "detail" | "quiz";
export function WritingClient({ kanaList }: { kanaList: Kana[] }) {
  const [mode, setMode] = useState<ViewMode>("grid");
  const [selectedKana, setSelectedKana] = useState<Kana | null>(null);
  const [showRomaji, setShowRomaji] = useState(true);
  const [showHindi, setShowHindi] = useState(false);
  const [, setAnimating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Quiz state
  const [quizKana, setQuizKana] = useState<Kana | null>(null);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAttemptKey, setQuizAttemptKey] = useState(() => createXpAttemptKey());

  // Group kana by group_name
  const groups = kanaList.reduce<Record<string, Kana[]>>((acc, k) => {
    if (!acc[k.group_name]) acc[k.group_name] = [];
    acc[k.group_name].push(k);
    return acc;
  }, {});

  /* 🔊 Pronunciation */
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = 0.7;
    const voices = window.speechSynthesis.getVoices();
    const ja = voices.find((v) => v.lang.startsWith("ja"));
    if (ja) u.voice = ja;
    window.speechSynthesis.speak(u);
  }, []);

  /* Stroke animation trigger */
  const playStrokeAnimation = () => {
    setAnimating(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimating(true));
    });
  };

  /* Start quiz */
  const startQuiz = () => {
    setQuizScore({ correct: 0, total: 0 });
    setQuizIndex(0);
    setQuizAnswer(null);
    setQuizAttemptKey(createXpAttemptKey());
    nextQuizQuestion(0);
    setMode("quiz");
  };

  const nextQuizQuestion = (index: number) => {
    if (index >= kanaList.length) return;
    const target = kanaList[index];
    setQuizKana(target);
    setQuizAnswer(null);
    // Generate 4 options with correct answer
    const others = kanaList.filter((k) => k.id !== target.id);
    const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [...shuffled.map((k) => k.romaji), target.romaji].sort(() => Math.random() - 0.5);
    setQuizOptions(opts);
  };

  const handleQuizAnswer = (answer: string) => {
    if (quizAnswer) return; // Already answered
    setQuizAnswer(answer);
    const isCorrect = answer === quizKana?.romaji;
    setQuizScore((s) => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
    }));
    if (quizKana) speak(quizKana.character);
    // Auto advance after delay
    const newCorrect = quizScore.correct + (isCorrect ? 1 : 0);
    setTimeout(async () => {
      const next = quizIndex + 1;
      if (next < kanaList.length) {
        setQuizIndex(next);
        nextQuizQuestion(next);
      } else {
        // Quiz complete — stay on results
        setQuizKana(null);
        try {
          const { awardQuizXp } = await import("@/app/actions/gamification");
          await awardQuizXp({
            activityType: "writing_quiz",
            correctAnswers: newCorrect,
            totalQuestions: kanaList.length,
            attemptKey: quizAttemptKey,
          });
        } catch (err) {
          console.error("Failed to record learning attempt", err);
        }
      }
    }, 1500);
  };

  /* === GRID VIEW === */
  if (mode === "grid") {
    return (
      <div>
        {/* Controls */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setShowRomaji(!showRomaji)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 text-sm hover:border-primary-300 transition-all"
          >
            {showRomaji ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showRomaji ? "Hide" : "Show"} Romaji
          </button>
          <button
            onClick={() => setShowHindi(!showHindi)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
              showHindi
                ? "bg-orange-50 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300"
                : "bg-white/80 dark:bg-gray-800/60 border-slate-200 dark:border-gray-700 hover:border-orange-300"
            }`}
          >
            🇮🇳 हिंदी
          </button>
          <button
            onClick={startQuiz}
            className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg-primary text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
          >
            🧠 Quiz Me
          </button>
        </div>

        {/* Character Grid by Group */}
        {Object.entries(groups).map(([groupName, chars]) => (
          <div key={groupName} className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${GROUP_COLORS[groupName]?.replace("border-l-", "bg-") || "bg-gray-400"}`}
              />
              {groupName}
            </h3>
            <div className="grid grid-cols-5 sm:grid-cols-5 gap-2 sm:gap-3">
              {chars.map((k) => (
                <button
                  key={k.id}
                  onClick={() => {
                    setSelectedKana(k);
                    setMode("detail");
                    playStrokeAnimation();
                    speak(k.character);
                  }}
                  className={`group relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl bg-white/80 dark:bg-gray-800/60 border-l-[3px] ${GROUP_COLORS[groupName] || "border-l-gray-400"} border border-slate-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 backdrop-blur-sm aspect-square`}
                >
                  <span className="text-3xl sm:text-4xl font-jp font-bold group-hover:scale-110 transition-transform">
                    {k.character}
                  </span>
                  {showRomaji && (
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                      {k.romaji}
                    </span>
                  )}
                  {showHindi && k.romaji_hindi && (
                    <span className="text-[10px] sm:text-xs text-orange-500 dark:text-orange-400 mt-0.5">
                      {k.romaji_hindi}
                    </span>
                  )}
                  <span className="absolute top-1 right-1.5 text-[9px] text-gray-300 dark:text-gray-600">
                    {k.stroke_count}画
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* === DETAIL VIEW === */
  if (mode === "detail" && selectedKana) {
    const totalSteps = selectedKana.stroke_count;

    /* Auto-play handler */
    const startAutoPlay = () => {
      setCurrentStep(0);
      setIsAutoPlaying(true);
      let step = 0;
      const interval = setInterval(() => {
        step++;
        if (step >= totalSteps) {
          clearInterval(interval);
          setCurrentStep(totalSteps);
          setIsAutoPlaying(false);
        } else {
          setCurrentStep(step);
        }
      }, 800);
    };

    /* Clip percentage for a given step (top-to-bottom reveal) */
    const clipForStep = (step: number) => {
      if (step >= totalSteps) return "inset(0 0 0 0)";
      const revealPct = (step / totalSteps) * 100;
      const clipBottom = 100 - revealPct;
      return `inset(0 0 ${clipBottom}% 0)`;
    };

    return (
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => {
            setMode("grid");
            setCurrentStep(0);
          }}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-6 transition-colors"
        >
          ← Back to grid
        </button>

        {/* Main card */}
        <div className="bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm rounded-3xl border border-slate-200 dark:border-gray-700 p-6 sm:p-8 mb-4">
          {/* Group badge + stroke count */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium">
              {selectedKana.group_name}
            </span>
            <span className="text-xs text-gray-400">{selectedKana.stroke_count} strokes</span>
          </div>

          {/* ─── STROKE ORDER ANIMATION ─── */}
          {isKanaSupported(selectedKana.character) ? (
            /* HanziWriter mode — accurate stroke animation + practice */
            <div className="mb-5">
              <div className="flex justify-center mb-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 font-medium">
                  ✨ Interactive Stroke Order
                </span>
              </div>
              <StrokeWriter character={selectedKana.character} size={220} />
            </div>
          ) : (
            /* Fallback: step-by-step clip-path for unsupported characters */
            <>
              {/* Filmstrip — small frames showing progressive build-up */}
              <div className="flex justify-center gap-1.5 sm:gap-2 mb-5 overflow-x-auto pb-1">
                {Array.from({ length: totalSteps + 1 }, (_, step) => (
                  <button
                    key={step}
                    onClick={() => setCurrentStep(step)}
                    className={`relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 transition-all duration-200 ${
                      currentStep === step
                        ? "border-primary-500 shadow-md shadow-primary-200/50 dark:shadow-primary-900/30 scale-105"
                        : "border-slate-200 dark:border-gray-700 hover:border-primary-300"
                    } bg-slate-50 dark:bg-gray-900/50 overflow-hidden`}
                  >
                    {/* Step number badge */}
                    <span
                      className={`absolute top-0.5 right-0.5 text-[8px] font-bold z-10 ${
                        currentStep === step ? "text-primary-600" : "text-gray-400"
                      }`}
                    >
                      {step === 0 ? "—" : step}
                    </span>

                    {/* Ghost guide */}
                    <span
                      className="absolute inset-0 flex items-center justify-center font-jp text-2xl sm:text-3xl"
                      style={{ color: "currentColor", opacity: 0.1 }}
                    >
                      {selectedKana.character}
                    </span>

                    {/* Revealed portion */}
                    {step > 0 && (
                      <span
                        className="absolute inset-0 flex items-center justify-center font-jp text-2xl sm:text-3xl font-bold"
                        style={{
                          clipPath: clipForStep(step),
                          color: "currentColor",
                          opacity: 0.85,
                          transition: "clip-path 0.3s ease-out",
                        }}
                      >
                        {selectedKana.character}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Main large display */}
              <div className="flex justify-center mb-5">
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center bg-slate-50 dark:bg-gray-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-gray-700 overflow-hidden">
                  {/* Grid lines */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="w-full h-px bg-slate-200/40 dark:bg-gray-600/30 absolute top-1/2" />
                    <div className="h-full w-px bg-slate-200/40 dark:bg-gray-600/30 absolute left-1/2" />
                  </div>

                  {/* Ghost character */}
                  <span
                    className="absolute font-jp text-[140px] leading-none select-none"
                    style={{ color: "currentColor", opacity: 0.08 }}
                  >
                    {selectedKana.character}
                  </span>

                  {/* Revealed character */}
                  {currentStep > 0 && (
                    <span
                      className="absolute font-jp text-[140px] leading-none font-bold select-none transition-all duration-500 ease-out"
                      style={{
                        clipPath: clipForStep(currentStep),
                        color: "currentColor",
                        opacity: 0.9,
                      }}
                    >
                      {selectedKana.character}
                    </span>
                  )}

                  <div className="absolute bottom-2 right-2.5 text-xs font-bold text-gray-400 dark:text-gray-500">
                    {currentStep === 0
                      ? "Ready"
                      : currentStep >= totalSteps
                        ? "✅ Done"
                        : `${currentStep} / ${totalSteps}`}
                  </div>
                </div>
              </div>

              {/* Step controls */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0 || isAutoPlaying}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-sm font-medium hover:border-primary-300 transition-all disabled:opacity-30"
                >
                  ◀ Prev
                </button>
                <button
                  onClick={startAutoPlay}
                  disabled={isAutoPlaying}
                  className="px-4 py-2 rounded-lg gradient-bg-primary text-white text-sm font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                >
                  {isAutoPlaying ? "Playing..." : "▶ Auto Play"}
                </button>
                <button
                  onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                  disabled={currentStep >= totalSteps || isAutoPlaying}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-sm font-medium hover:border-primary-300 transition-all disabled:opacity-30"
                >
                  Next ▶
                </button>
                <button
                  onClick={() => setCurrentStep(0)}
                  disabled={isAutoPlaying}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-sm hover:border-primary-300 transition-all disabled:opacity-30"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* Romaji + Hindi */}
          <div className="text-center mb-5">
            <p className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-1">
              {selectedKana.romaji}
            </p>
            {selectedKana.romaji_hindi && (
              <p className="text-lg text-orange-500 dark:text-orange-400 font-medium mb-1">
                {selectedKana.romaji_hindi}
              </p>
            )}
            <p className="text-sm text-gray-400">pronunciation</p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 justify-center mb-5">
            <button
              onClick={() => speak(selectedKana.character)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-bg-primary text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
            >
              <Volume2 className="w-4 h-4" /> Listen
            </button>
          </div>

          {/* Stroke hint */}
          {selectedKana.stroke_hint && (
            <div className="bg-slate-50 dark:bg-gray-900/50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                ✍️ Stroke Order
              </p>
              <div className="space-y-1">
                {selectedKana.stroke_hint.split(", ").map((hint, i) => {
                  const isCurrentStroke = currentStep === i + 1;
                  return (
                    <p
                      key={i}
                      className={`text-sm transition-all duration-200 ${
                        isCurrentStroke
                          ? "text-primary-600 dark:text-primary-400 font-semibold"
                          : i < currentStep
                            ? "text-gray-700 dark:text-gray-200"
                            : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold mr-2 ${
                          isCurrentStroke
                            ? "bg-primary-600 text-white scale-110"
                            : i < currentStep
                              ? "bg-gray-700 dark:bg-gray-300 text-white dark:text-gray-900"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                        } transition-all`}
                      >
                        {i + 1}
                      </span>
                      {hint.replace(/^\d+→\s*/, "")}
                    </p>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Nav arrows */}
        <div className="flex justify-between">
          <button
            onClick={() => {
              const idx = kanaList.findIndex((k) => k.id === selectedKana.id);
              if (idx > 0) {
                setSelectedKana(kanaList[idx - 1]);
                setCurrentStep(0);
                speak(kanaList[idx - 1].character);
              }
            }}
            className="px-4 py-2 rounded-xl bg-white/80 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 text-sm hover:border-primary-300 transition-all disabled:opacity-30"
            disabled={kanaList.findIndex((k) => k.id === selectedKana.id) === 0}
          >
            ← Previous
          </button>
          <button
            onClick={() => {
              const idx = kanaList.findIndex((k) => k.id === selectedKana.id);
              if (idx < kanaList.length - 1) {
                setSelectedKana(kanaList[idx + 1]);
                setCurrentStep(0);
                speak(kanaList[idx + 1].character);
              }
            }}
            className="flex items-center gap-1 px-4 py-2 rounded-xl gradient-bg-primary text-white text-sm font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-30"
            disabled={kanaList.findIndex((k) => k.id === selectedKana.id) === kanaList.length - 1}
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  /* === QUIZ VIEW === */
  if (mode === "quiz") {
    // Quiz complete
    if (!quizKana) {
      const pct = quizScore.total > 0 ? Math.round((quizScore.correct / quizScore.total) * 100) : 0;
      return (
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm rounded-3xl border border-slate-200 dark:border-gray-700 p-8">
            <p className="text-6xl mb-4">{pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📚"}</p>
            <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
            <p className="text-lg mb-1">
              <span className="text-primary-600 dark:text-primary-400 font-bold">
                {quizScore.correct}
              </span>
              <span className="text-gray-400"> / {quizScore.total}</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">{pct}% accuracy</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={startQuiz}
                className="px-4 py-2.5 rounded-xl gradient-bg-primary text-white text-sm font-medium shadow-md"
              >
                🔄 Try Again
              </button>
              <button
                onClick={() => setMode("grid")}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-sm"
              >
                ← Back to Grid
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Active question
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setMode("grid")}
            className="text-sm text-gray-500 hover:text-primary-600"
          >
            ← Exit Quiz
          </button>
          <span className="text-sm text-gray-400">
            {quizIndex + 1} / {kanaList.length}
          </span>
          <span className="text-sm font-bold text-primary-600">
            {quizScore.correct}/{quizScore.total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-200 dark:bg-gray-700 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full gradient-bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((quizIndex + 1) / kanaList.length) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div className="bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm rounded-3xl border border-slate-200 dark:border-gray-700 p-8 mb-6">
          <p className="text-sm text-gray-400 mb-4">What is the reading of this character?</p>
          <button onClick={() => speak(quizKana.character)} className="mb-6">
            <span className="text-8xl font-jp font-bold hover:scale-105 transition-transform inline-block">
              {quizKana.character}
            </span>
          </button>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            {quizOptions.map((opt) => {
              const isCorrect = opt === quizKana.romaji;
              const isSelected = quizAnswer === opt;
              let btnClass =
                "bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 hover:border-primary-300";
              if (quizAnswer) {
                if (isCorrect)
                  btnClass =
                    "bg-green-50 dark:bg-green-900/30 border-2 border-green-500 text-green-700 dark:text-green-300";
                else if (isSelected)
                  btnClass =
                    "bg-red-50 dark:bg-red-900/30 border-2 border-red-500 text-red-700 dark:text-red-300";
                else
                  btnClass =
                    "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 opacity-50";
              }
              return (
                <button
                  key={opt}
                  onClick={() => handleQuizAnswer(opt)}
                  disabled={!!quizAnswer}
                  className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-base font-bold transition-all ${btnClass}`}
                >
                  {quizAnswer && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {quizAnswer && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
