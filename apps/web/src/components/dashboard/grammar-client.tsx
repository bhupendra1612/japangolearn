"use client";

import { useState, useCallback } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Volume2,
  BookOpen,
  Sparkles,
  Brain,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface GrammarPattern {
  id: number;
  title: string;
  structure: string;
  meaning: string;
  explanation: string;
  examples: { jp: string; romaji: string; en: string }[];
  category: string;
  jlpt_level: string;
  order_index: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  Particles: "🔤",
  "Verb Forms": "💪",
  Adjectives: "🎨",
  "Sentence Enders": "💬",
  Expressions: "🗣️",
  Connectors: "🔗",
  Comparisons: "⚖️",
  "Time & Frequency": "⏰",
};

const CATEGORY_COLORS: Record<string, { pill: string; border: string; bg: string }> = {
  Particles: {
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    border: "border-l-blue-500",
    bg: "bg-blue-50/50 dark:bg-blue-950/20",
  },
  "Verb Forms": {
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    border: "border-l-emerald-500",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
  },
  Adjectives: {
    pill: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
    border: "border-l-pink-500",
    bg: "bg-pink-50/50 dark:bg-pink-950/20",
  },
  "Sentence Enders": {
    pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    border: "border-l-amber-500",
    bg: "bg-amber-50/50 dark:bg-amber-950/20",
  },
  Expressions: {
    pill: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    border: "border-l-violet-500",
    bg: "bg-violet-50/50 dark:bg-violet-950/20",
  },
  Connectors: {
    pill: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    border: "border-l-teal-500",
    bg: "bg-teal-50/50 dark:bg-teal-950/20",
  },
  Comparisons: {
    pill: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    border: "border-l-orange-500",
    bg: "bg-orange-50/50 dark:bg-orange-950/20",
  },
  "Time & Frequency": {
    pill: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    border: "border-l-indigo-500",
    bg: "bg-indigo-50/50 dark:bg-indigo-950/20",
  },
};

export function GrammarClient({ patterns }: { patterns: GrammarPattern[] }) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [mobileCatOpen, setMobileCatOpen] = useState(false);

  const [mode, setMode] = useState<"library" | "quiz">("library");
  const [quizPattern, setQuizPattern] = useState<GrammarPattern | null>(null);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizPool, setQuizPool] = useState<GrammarPattern[]>([]);

  const categories = ["All", ...Array.from(new Set(patterns.map((p) => p.category)))];

  const filtered = patterns.filter((p) => {
    const matchCategory = selectedCategory === "All" || p.category === selectedCategory;
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.meaning.toLowerCase().includes(search.toLowerCase()) ||
      p.structure.toLowerCase().includes(search.toLowerCase()) ||
      p.explanation.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined") return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = 0.8;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }, []);

  const toggle = (id: number) => setExpandedId(expandedId === id ? null : id);

  const startQuiz = () => {
    const pool = filtered.length > 0 ? filtered : patterns;
    if (pool.length < 4) {
      alert("Please select a category with at least 4 patterns to try the quiz.");
      return;
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
    setQuizPool(shuffled);
    setQuizScore({ correct: 0, total: 0 });
    setQuizIndex(0);
    setQuizAnswer(null);
    nextQuizQuestion(0, shuffled);
    setMode("quiz");
  };

  const nextQuizQuestion = (index: number, pool: GrammarPattern[]) => {
    if (index >= pool.length) {
      setQuizPattern(null);
      return;
    }
    const target = pool[index];
    setQuizPattern(target);
    setQuizAnswer(null);

    const others = patterns.filter((p) => p.id !== target.id);
    const randomOthers = others.sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [...randomOthers.map((p) => p.meaning), target.meaning].sort(
      () => Math.random() - 0.5
    );
    setQuizOptions(opts);
  };

  const handleQuizAnswer = (answer: string) => {
    if (quizAnswer) return;
    setQuizAnswer(answer);
    const isCorrect = answer === quizPattern?.meaning;
    const newCorrect = quizScore.correct + (isCorrect ? 1 : 0);
    const newTotal = quizScore.total + 1;
    setQuizScore({ correct: newCorrect, total: newTotal });

    setTimeout(async () => {
      const next = quizIndex + 1;
      setQuizIndex(next);
      if (next >= quizPool.length) {
        setQuizPattern(null);
        if (newCorrect > 0) {
          try {
            const { awardXp, updateDailyTaskProgress } = await import("@/app/actions/gamification");
            const xp = newCorrect * 5; // 5 XP per correct answer
            await awardXp({ type: "grammar", title: "Grammar Quiz Completed", xpAmount: xp });
            await updateDailyTaskProgress({ taskId: "grammar", xpAmount: xp });
          } catch (err) {
            console.error("Failed to award XP", err);
          }
        }
      } else {
        nextQuizQuestion(next, quizPool);
      }
    }, 1500);
  };

  if (mode === "quiz") {
    if (!quizPattern) {
      const pct = quizScore.total > 0 ? Math.round((quizScore.correct / quizScore.total) * 100) : 0;
      return (
        <div className="max-w-md mx-auto text-center mt-10">
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
                onClick={() => setMode("library")}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-sm"
              >
                ← Back to Library
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto text-center mt-4">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setMode("library")}
            className="text-sm text-gray-500 hover:text-primary-600"
          >
            ← Exit Quiz
          </button>
          <span className="text-sm text-gray-400">
            {quizIndex + 1} / {quizPool.length}
          </span>
          <span className="text-sm font-bold text-primary-600">
            {quizScore.correct}/{quizScore.total}
          </span>
        </div>

        <div className="h-1.5 bg-slate-200 dark:bg-gray-700 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full gradient-bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((quizIndex + 1) / quizPool.length) * 100}%` }}
          />
        </div>

        <div className="bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm rounded-3xl border border-slate-200 dark:border-gray-700 p-8 mb-6">
          <p className="text-sm text-gray-400 mb-4">What does this pattern mean?</p>
          <div className="mb-6">
            <span className="text-4xl font-jp font-bold inline-block text-primary-600 dark:text-primary-400">
              {quizPattern.structure}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {quizOptions.map((opt) => {
              const isCorrect = opt === quizPattern.meaning;
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
                  className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${btnClass}`}
                >
                  {quizAnswer && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  )}
                  {quizAnswer && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                  )}
                  <span className="truncate" title={opt}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search grammar patterns..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        <button
          onClick={startQuiz}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl gradient-bg-primary text-white text-sm font-medium shadow-md hover:shadow-lg transition-all shrink-0"
        >
          <Brain className="w-4 h-4" /> Quiz Me
        </button>

        {/* Mobile category dropdown */}
        <div className="sm:hidden">
          <button
            onClick={() => setMobileCatOpen(!mobileCatOpen)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-sm"
          >
            <span>
              {selectedCategory !== "All" && `${CATEGORY_ICONS[selectedCategory] || "📚"} `}
              {selectedCategory} ({selectedCategory === "All" ? patterns.length : filtered.length})
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${mobileCatOpen ? "rotate-180" : ""}`}
            />
          </button>
          {mobileCatOpen && (
            <div className="absolute z-20 mt-1 w-[calc(100%-2rem)] bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xl py-1 max-h-60 overflow-y-auto">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setSelectedCategory(c);
                    setMobileCatOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-gray-700 ${selectedCategory === c ? "text-primary-600 font-semibold" : ""}`}
                >
                  {c !== "All" && `${CATEGORY_ICONS[c] || "📚"} `}
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Desktop category pills */}
      <div className="hidden sm:flex flex-wrap gap-2 mb-6">
        {categories.map((c) => {
          const count =
            c === "All" ? patterns.length : patterns.filter((p) => p.category === c).length;
          const isActive = selectedCategory === c;
          const colors = CATEGORY_COLORS[c];
          return (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isActive
                  ? c === "All"
                    ? "gradient-bg-primary text-white shadow-md"
                    : `${colors?.pill || "bg-primary-100 text-primary-700"} shadow-sm ring-1 ring-current/10`
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700 hover:border-primary-300"
              }`}
            >
              {c !== "All" && <span className="mr-1">{CATEGORY_ICONS[c]}</span>}
              {c} <span className="ml-1 opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-400 mb-4">
        Showing {filtered.length} of {patterns.length} patterns
      </p>

      {/* Pattern cards */}
      <div className="space-y-3">
        {filtered.map((p) => {
          const isOpen = expandedId === p.id;
          const colors = CATEGORY_COLORS[p.category];

          return (
            <div
              key={p.id}
              className={`bg-white/80 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-gray-700 border-l-4 ${colors?.border || "border-l-primary-500"} overflow-hidden transition-all duration-200 hover:shadow-md`}
            >
              {/* Header — always visible */}
              <button
                onClick={() => toggle(p.id)}
                className="w-full flex items-start gap-3 p-4 sm:p-5 text-left"
              >
                {/* Icon */}
                <span className="text-xl mt-0.5 flex-shrink-0">
                  {CATEGORY_ICONS[p.category] || "📚"}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 font-jp text-base">
                      {p.title}
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors?.pill || "bg-gray-100 text-gray-600"}`}
                    >
                      {p.category}
                    </span>
                  </div>

                  {/* Structure formula — highlighted */}
                  <p className="text-sm font-mono bg-slate-100 dark:bg-gray-900/50 rounded-lg px-3 py-1.5 mb-1.5 inline-block text-primary-700 dark:text-primary-400 font-medium">
                    {p.structure}
                  </p>

                  {/* Meaning */}
                  <p className="text-sm text-gray-600 dark:text-gray-400">{p.meaning}</p>
                </div>

                {/* Expand icon */}
                <div className="flex-shrink-0 mt-1">
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 border-t border-slate-100 dark:border-gray-700/50 pt-4">
                  {/* Explanation */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Explanation
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {p.explanation}
                    </p>
                  </div>

                  {/* Examples */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> Examples
                    </p>
                    <div className="space-y-3">
                      {p.examples.map((ex, i) => (
                        <div
                          key={i}
                          className={`rounded-xl p-3 ${colors?.bg || "bg-slate-50 dark:bg-gray-900/30"}`}
                        >
                          <div className="flex items-start gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                speak(ex.jp);
                              }}
                              className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center hover:bg-primary-200 transition-colors"
                            >
                              <Volume2 className="w-3 h-3" />
                            </button>
                            <div>
                              <p className="font-jp text-base font-medium text-gray-900 dark:text-gray-100 mb-0.5">
                                {ex.jp}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-0.5">
                                {ex.romaji}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{ex.en}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-sm">No patterns found.</p>
        </div>
      )}
    </div>
  );
}
