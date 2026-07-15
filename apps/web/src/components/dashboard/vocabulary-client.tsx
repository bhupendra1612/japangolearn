"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, Globe, ChevronDown, Volume2, CheckCircle2, XCircle, Brain } from "lucide-react";
import { createXpAttemptKey } from "@japangolearn/content";

interface VocabWord {
  id: number;
  kanji: string;
  hiragana: string;
  romaji: string;
  romaji_hindi: string | null;
  english: string;
  topic: string;
  icon: string | null;
}

const TOPIC_ICONS: Record<string, string> = {
  Numbers: "🔢",
  "Week Days": "📅",
  Months: "📆",
  Time: "⏰",
  Directions: "🧭",
  Colors: "🎨",
  Seasons: "🌸",
  "Body Parts": "🦴",
  "Fruits & Vegetables": "🍎",
  "Animals & Birds": "🐾",
  Vehicles: "🚗",
  Family: "👨‍👩‍👧‍👦",
  Verbs: "💪",
  "Greetings & Expressions": "👋",
  "Pronouns & People": "🧑",
  "Question Words": "❓",
  "School & Study": "🏫",
  "House & Rooms": "🏠",
  "Position Words": "📍",
  Conjunctions: "🔗",
  "Food & Drink": "🍽️",
  "i-Adjectives": "📝",
  "na-Adjectives": "📝",
  Clothing: "👔",
  Adverbs: "⚡",
  "Places & Buildings": "🏢",
  "Nature & Weather": "🌿",
  "Daily Life": "🌟",
  Counters: "🔢",
};

/* Topic accent color classes — left border + subtle bg tint */
const TOPIC_COLORS: Record<string, { border: string; glow: string }> = {
  Numbers: { border: "border-l-blue-500", glow: "hover:shadow-blue-500/10" },
  "Week Days": { border: "border-l-violet-500", glow: "hover:shadow-violet-500/10" },
  Months: { border: "border-l-indigo-500", glow: "hover:shadow-indigo-500/10" },
  Time: { border: "border-l-amber-500", glow: "hover:shadow-amber-500/10" },
  Directions: { border: "border-l-teal-500", glow: "hover:shadow-teal-500/10" },
  Colors: { border: "border-l-pink-500", glow: "hover:shadow-pink-500/10" },
  Seasons: { border: "border-l-rose-400", glow: "hover:shadow-rose-400/10" },
  "Body Parts": { border: "border-l-slate-500", glow: "hover:shadow-slate-500/10" },
  "Fruits & Vegetables": { border: "border-l-green-500", glow: "hover:shadow-green-500/10" },
  "Animals & Birds": { border: "border-l-orange-500", glow: "hover:shadow-orange-500/10" },
  Vehicles: { border: "border-l-cyan-500", glow: "hover:shadow-cyan-500/10" },
  Family: { border: "border-l-red-400", glow: "hover:shadow-red-400/10" },
  Verbs: { border: "border-l-emerald-500", glow: "hover:shadow-emerald-500/10" },
  "Greetings & Expressions": { border: "border-l-yellow-500", glow: "hover:shadow-yellow-500/10" },
  "Pronouns & People": { border: "border-l-sky-500", glow: "hover:shadow-sky-500/10" },
  "Question Words": { border: "border-l-fuchsia-500", glow: "hover:shadow-fuchsia-500/10" },
  "School & Study": { border: "border-l-lime-500", glow: "hover:shadow-lime-500/10" },
  "House & Rooms": { border: "border-l-stone-500", glow: "hover:shadow-stone-500/10" },
  "Position Words": { border: "border-l-purple-500", glow: "hover:shadow-purple-500/10" },
  Conjunctions: { border: "border-l-zinc-500", glow: "hover:shadow-zinc-500/10" },
  "Food & Drink": { border: "border-l-red-500", glow: "hover:shadow-red-500/10" },
  "i-Adjectives": { border: "border-l-blue-400", glow: "hover:shadow-blue-400/10" },
  "na-Adjectives": { border: "border-l-indigo-400", glow: "hover:shadow-indigo-400/10" },
  Clothing: { border: "border-l-violet-400", glow: "hover:shadow-violet-400/10" },
  Adverbs: { border: "border-l-amber-400", glow: "hover:shadow-amber-400/10" },
  "Places & Buildings": { border: "border-l-teal-400", glow: "hover:shadow-teal-400/10" },
  "Nature & Weather": { border: "border-l-green-400", glow: "hover:shadow-green-400/10" },
  "Daily Life": { border: "border-l-orange-400", glow: "hover:shadow-orange-400/10" },
  Counters: { border: "border-l-cyan-400", glow: "hover:shadow-cyan-400/10" },
};

export function VocabularyClient({ words }: { words: VocabWord[] }) {
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [showHindi, setShowHindi] = useState(false);
  const [mobileTopicOpen, setMobileTopicOpen] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);

  const [mode, setMode] = useState<"library" | "quiz">("library");
  const [quizWord, setQuizWord] = useState<VocabWord | null>(null);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizPool, setQuizPool] = useState<VocabWord[]>([]);
  const [quizAttemptKey, setQuizAttemptKey] = useState(() => createXpAttemptKey());

  const topics = useMemo(() => {
    const set = new Set(words.map((w) => w.topic));
    return ["All", ...Array.from(set)];
  }, [words]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return words.filter((w) => {
      const topicMatch = selectedTopic === "All" || w.topic === selectedTopic;
      if (!topicMatch) return false;
      if (!q) return true;
      return (
        w.kanji.includes(q) ||
        w.hiragana.includes(q) ||
        w.romaji.toLowerCase().includes(q) ||
        w.english.toLowerCase().includes(q) ||
        (showHindi && w.romaji_hindi?.includes(q))
      );
    });
  }, [words, search, selectedTopic, showHindi]);

  const topicCounts = useMemo(() => {
    const map: Record<string, number> = { All: words.length };
    words.forEach((w) => {
      map[w.topic] = (map[w.topic] || 0) + 1;
    });
    return map;
  }, [words]);

  /* 🔊 Web Speech API pronunciation */
  const speak = useCallback((word: VocabWord) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word.hiragana);
    utterance.lang = "ja-JP";
    utterance.rate = 0.85; // Slightly slower for learning
    utterance.pitch = 1;

    // Try to find a Japanese voice
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find((v) => v.lang.startsWith("ja"));
    if (jaVoice) utterance.voice = jaVoice;

    setSpeakingId(word.id);
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    window.speechSynthesis.speak(utterance);
  }, []);

  const startQuiz = () => {
    const pool = filtered.length > 0 ? filtered : words;
    if (pool.length < 4) {
      alert("Please select a topic with at least 4 words to try the quiz.");
      return;
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 10); // max 10 questions per quiz
    setQuizPool(shuffled);
    setQuizScore({ correct: 0, total: 0 });
    setQuizIndex(0);
    setQuizAnswer(null);
    setQuizAttemptKey(createXpAttemptKey());
    nextQuizQuestion(0, shuffled);
    setMode("quiz");
  };

  const nextQuizQuestion = (index: number, pool: VocabWord[]) => {
    if (index >= pool.length) {
      setQuizWord(null); // finish
      return;
    }
    const target = pool[index];
    setQuizWord(target);
    setQuizAnswer(null);

    // Generate 4 options (English meaning)
    const others = words.filter((w) => w.id !== target.id);
    const randomOthers = others.sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [...randomOthers.map((w) => w.english), target.english].sort(
      () => Math.random() - 0.5
    );
    setQuizOptions(opts);
  };

  const handleQuizAnswer = (answer: string) => {
    if (quizAnswer) return;
    setQuizAnswer(answer);
    const isCorrect = answer === quizWord?.english;
    const newCorrect = quizScore.correct + (isCorrect ? 1 : 0);
    const newTotal = quizScore.total + 1;
    setQuizScore({ correct: newCorrect, total: newTotal });
    if (quizWord) speak(quizWord);

    setTimeout(async () => {
      const next = quizIndex + 1;
      setQuizIndex(next);
      if (next >= quizPool.length) {
        setQuizWord(null);
        if (newCorrect > 0) {
          try {
            const { awardQuizXp } = await import("@/app/actions/gamification");
            await awardQuizXp({
              activityType: "vocabulary_quiz",
              correctAnswers: newCorrect,
              totalQuestions: quizPool.length,
              attemptKey: quizAttemptKey,
            });
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
    if (!quizWord) {
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
          <p className="text-sm text-gray-400 mb-4">What does this mean?</p>
          <button onClick={() => speak(quizWord)} className="mb-6">
            <span className="text-6xl font-jp font-bold hover:scale-105 transition-transform inline-block">
              {quizWord.kanji !== quizWord.hiragana ? quizWord.kanji : quizWord.hiragana}
            </span>
          </button>
          <p className="text-lg font-jp text-primary-600 dark:text-primary-400 mb-6">
            {quizWord.hiragana}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quizOptions.map((opt) => {
              const isCorrect = opt === quizWord.english;
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
    <>
      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search kanji, hiragana, romaji, or English…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/80 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent backdrop-blur-sm"
          />
        </div>

        {/* Hindi toggle */}
        <button
          onClick={() => setShowHindi(!showHindi)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shrink-0 ${
            showHindi
              ? "gradient-bg-primary text-white shadow-md"
              : "bg-white/80 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-300"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">हिंदी</span> Hindi
          <span className={`w-2 h-2 rounded-full ${showHindi ? "bg-green-300" : "bg-gray-300"}`} />
        </button>
        <button
          onClick={startQuiz}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-bg-primary text-white text-sm font-medium shadow-md hover:shadow-lg transition-all shrink-0"
        >
          <Brain className="w-4 h-4" /> Quiz Me
        </button>
      </div>

      {/* Topic pills — desktop */}
      <div className="hidden sm:flex flex-wrap gap-2 mb-6">
        {topics.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTopic(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
              selectedTopic === t
                ? "gradient-bg-primary text-white shadow-md"
                : "bg-white/80 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-300 dark:hover:border-primary-600"
            }`}
          >
            {t !== "All" && <span>{TOPIC_ICONS[t] || "📚"}</span>}
            {t}
            <span
              className={`ml-0.5 text-[10px] ${selectedTopic === t ? "text-white/70" : "text-gray-400"}`}
            >
              {topicCounts[t] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Topic dropdown — mobile */}
      <div className="sm:hidden mb-4 relative">
        <button
          onClick={() => setMobileTopicOpen(!mobileTopicOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/80 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 text-sm"
        >
          <span>
            {selectedTopic !== "All" && `${TOPIC_ICONS[selectedTopic] || "📚"} `}
            {selectedTopic} ({topicCounts[selectedTopic] || 0})
          </span>
          <ChevronDown
            className={`w-4 h-4 transition-transform ${mobileTopicOpen ? "rotate-180" : ""}`}
          />
        </button>
        {mobileTopicOpen && (
          <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setSelectedTopic(t);
                  setMobileTopicOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-gray-700 ${selectedTopic === t ? "text-primary-600 font-semibold" : ""}`}
              >
                {t !== "All" && `${TOPIC_ICONS[t] || "📚"} `}
                {t} ({topicCounts[t] || 0})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-400 mb-4">
        Showing {filtered.length} of {words.length} words
      </p>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500 dark:text-gray-400">
            No words found. Try a different search or topic.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((w) => {
            const colors = TOPIC_COLORS[w.topic] || { border: "border-l-gray-400", glow: "" };
            const isSpeaking = speakingId === w.id;

            return (
              <div
                key={w.id}
                className={`group relative p-4 rounded-2xl bg-white/80 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 border-l-[3px] ${colors.border} hover:border-primary-200 dark:hover:border-primary-700 hover:-translate-y-0.5 hover:shadow-lg ${colors.glow} transition-all duration-200 backdrop-blur-sm overflow-hidden`}
              >
                {/* Background icon watermark */}
                {w.icon && (
                  <span className="absolute -right-2 -top-2 text-6xl opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-300 pointer-events-none select-none">
                    {w.icon}
                  </span>
                )}

                {/* Top row: icon + kanji + topic badge + speaker */}
                <div className="flex items-start justify-between mb-2 relative">
                  <div className="flex items-center gap-2">
                    {w.icon && (
                      <span className="text-2xl group-hover:scale-110 transition-transform">
                        {w.icon}
                      </span>
                    )}
                    <p className="text-3xl font-jp font-bold group-hover:scale-105 transition-transform origin-left">
                      {w.kanji}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* 🔊 Speaker button */}
                    <button
                      onClick={() => speak(w)}
                      title="Listen to pronunciation"
                      className={`p-1.5 rounded-lg transition-all duration-200 ${
                        isSpeaking
                          ? "bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 scale-110"
                          : "text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      <Volume2 className={`w-4 h-4 ${isSpeaking ? "animate-pulse" : ""}`} />
                    </button>
                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium">
                      {TOPIC_ICONS[w.topic] || "📚"} {w.topic}
                    </span>
                  </div>
                </div>

                {/* Hiragana */}
                <p className="text-base font-jp text-primary-600 dark:text-primary-400 mb-1">
                  {w.hiragana}
                </p>

                {/* Romaji */}
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-0.5">{w.romaji}</p>

                {/* Hindi pronunciation — conditional */}
                {showHindi && w.romaji_hindi && (
                  <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
                    🇮🇳 {w.romaji_hindi}
                  </p>
                )}

                {/* English — bolder & larger */}
                <p className="text-[15px] font-bold text-gray-900 dark:text-gray-50 mt-2 pt-2 border-t border-slate-100 dark:border-gray-700">
                  {w.english}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
