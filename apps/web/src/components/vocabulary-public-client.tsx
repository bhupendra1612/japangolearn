"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, Globe, ChevronDown, Volume2, Filter } from "lucide-react";
import Link from "next/link";

interface VocabWord {
  id: number;
  kanji: string;
  hiragana: string;
  romaji: string;
  romaji_hindi: string | null;
  english: string;
  topic: string;
  jlpt_level: string | null;
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

// Left-border accent colour for each topic card
const TOPIC_STYLING: Record<string, { border: string; glow: string }> = {
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

// Fancy glassy JLPT badges
const JLPT_BADGE: Record<string, string> = {
  N5: "bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50",
  N4: "bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700/50",
  N3: "bg-violet-100/80 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-700/50",
  N2: "bg-orange-100/80 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700/50",
  N1: "bg-red-100/80 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700/50",
};

export function VocabPublicClient({
  words,
  initialTopic,
  initialLevel,
}: {
  words: VocabWord[];
  initialTopic?: string;
  initialLevel?: string;
}) {
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState(initialTopic || "All");
  const [selectedLevel, setSelectedLevel] = useState(initialLevel || "All");
  const [showHindi, setShowHindi] = useState(false);
  const [mobileTopicOpen, setMobileTopicOpen] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);

  const topics = useMemo(() => {
    const set = new Set(words.map((w) => w.topic));
    return ["All", ...Array.from(set).sort()];
  }, [words]);

  const levels = ["All", "N5", "N4", "N3", "N2", "N1"];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return words.filter((w) => {
      const topicOk = selectedTopic === "All" || w.topic === selectedTopic;
      const levelOk = selectedLevel === "All" || w.jlpt_level === selectedLevel;
      if (!topicOk || !levelOk) return false;
      if (!q) return true;
      return (
        w.kanji.includes(q) ||
        w.hiragana.includes(q) ||
        w.romaji.toLowerCase().includes(q) ||
        w.english.toLowerCase().includes(q) ||
        (showHindi && w.romaji_hindi?.includes(q))
      );
    });
  }, [words, search, selectedTopic, selectedLevel, showHindi]);

  const topicCounts = useMemo(() => {
    const map: Record<string, number> = { All: words.length };
    words.forEach((w) => {
      map[w.topic] = (map[w.topic] || 0) + 1;
    });
    return map;
  }, [words]);

  const speak = useCallback((word: VocabWord) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(word.hiragana);
    utt.lang = "ja-JP";
    utt.rate = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find((v) => v.lang.startsWith("ja"));
    if (jaVoice) utt.voice = jaVoice;
    setSpeakingId(word.id);
    utt.onend = () => setSpeakingId(null);
    utt.onerror = () => setSpeakingId(null);
    window.speechSynthesis.speak(utt);
  }, []);

  return (
    <>
      {/* ── Search & Global Filters ──────────────── */}
      <div className="flex flex-col gap-4 mb-8">
        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-0 bg-primary-500/5 group-hover:bg-primary-500/10 dark:bg-primary-500/10 dark:group-hover:bg-primary-500/20 rounded-2xl blur-lg transition-all" />
          <div className="relative flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-focus-within:border-primary-500 dark:group-focus-within:border-primary-500 rounded-2xl p-2 shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary-500/20">
            <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 ml-2 shrink-0" />
            <input
              type="text"
              placeholder="Search by kanji, hiragana, romaji, English…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 px-3 py-2 outline-none"
            />
          </div>
        </div>

        {/* JLPT Levels & Language Toggles */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-x-auto no-scrollbar">
            <div className="px-2">
              <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </div>
            {levels.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-4 py-1.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  selectedLevel === lvl
                    ? "gradient-bg-primary text-white shadow-md neon-glow"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Hindi toggle */}
          <button
            onClick={() => setShowHindi(!showHindi)}
            className={`flex items-center gap-2 px-5 py-2 rounded-2xl text-sm font-bold transition-all border shadow-sm ${
              showHindi
                ? "gradient-bg-accent text-white border-transparent shadow-md neon-glow-accent"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-accent-400 hover:text-accent-600 dark:hover:text-accent-400"
            }`}
          >
            <Globe className="w-4 h-4" />
            🇮🇳 Hindi Romaji
          </button>
        </div>
      </div>

      {/* ── Topic Selector (Desktop) ─────────────── */}
      <div className="hidden md:flex flex-wrap gap-2.5 mb-8">
        {topics.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTopic(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all ${
              selectedTopic === t
                ? "bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 border-2 border-primary-500/50 shadow-inner"
                : "bg-white dark:bg-gray-800 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-600 dark:text-gray-400 shadow-sm"
            }`}
          >
            {t !== "All" && <span className="text-base">{TOPIC_ICONS[t] || "📚"}</span>}
            {t}
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full ${selectedTopic === t ? "bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400" : "bg-gray-100 dark:bg-gray-700 text-gray-400"}`}
            >
              {topicCounts[t] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* ── Topic Selector (Mobile) ──────────────── */}
      <div className="md:hidden mb-6 relative z-30">
        <button
          onClick={() => setMobileTopicOpen(!mobileTopicOpen)}
          className="w-full flex items-center justify-between px-5 py-3.5 bg-white dark:bg-gray-800 border-2 border-primary-500/20 rounded-2xl font-bold text-gray-800 dark:text-gray-200 shadow-sm"
        >
          <div className="flex items-center gap-3">
            {selectedTopic !== "All" && (
              <span className="text-xl">{TOPIC_ICONS[selectedTopic] || "📚"}</span>
            )}
            <span>
              {selectedTopic}{" "}
              <span className="opacity-50 font-normal ml-1">
                ({topicCounts[selectedTopic] || 0})
              </span>
            </span>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-primary-500 transition-transform ${mobileTopicOpen ? "rotate-180" : ""}`}
          />
        </button>
        {mobileTopicOpen && (
          <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl max-h-80 overflow-y-auto z-40">
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setSelectedTopic(t);
                  setMobileTopicOpen(false);
                }}
                className={`w-full text-left px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedTopic === t ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-bold" : "text-gray-700 dark:text-gray-300"}`}
              >
                <div className="flex items-center gap-3">
                  {t !== "All" && <span className="text-xl">{TOPIC_ICONS[t] || "📚"}</span>}
                  <span>{t}</span>
                </div>
                <span className="text-sm opacity-50">{topicCounts[t] || 0}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Results Count ────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          Showing <span className="text-gray-900 dark:text-white font-bold">{filtered.length}</span>{" "}
          results
        </p>
      </div>

      {/* ── Grid ─────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/30 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-5xl mb-4 opacity-50">🔍</p>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            No matching words
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your filters or searching for something else.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((w) => {
            const styling = TOPIC_STYLING[w.topic] || { border: "border-l-gray-400", glow: "" };
            const isSpeaking = speakingId === w.id;
            return (
              <div
                key={w.id}
                className={`group relative p-5 bg-white/70 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-gray-700/60 border-l-4 ${styling.border} hover:border-primary-400 dark:hover:border-primary-500 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-xl ${styling.glow} overflow-hidden flex flex-col`}
              >
                {/* Background Watermark Symbol */}
                {w.icon && (
                  <span className="absolute -right-4 -bottom-4 text-8xl opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-[0.08] dark:group-hover:opacity-[0.1] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 pointer-events-none select-none">
                    {w.icon}
                  </span>
                )}

                {/* Top Header Row */}
                <div className="flex items-start justify-between mb-3 relative z-10 w-full">
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex items-center justify-between w-full">
                      {/* Kanji */}
                      <p className="text-3xl font-jp font-bold text-gray-900 dark:text-white group-hover:scale-105 transition-transform origin-left">
                        {w.kanji}
                      </p>

                      {/* Actions/Badges */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => speak(w)}
                          title="Play audio pronunciation"
                          className={`p-2 rounded-xl transition-all duration-200 shadow-sm ${
                            isSpeaking
                              ? "bg-primary-100 dark:bg-primary-900/60 text-primary-600 dark:text-primary-400 scale-110 ring-2 ring-primary-500/50"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-gray-700 hover:shadow-md"
                          }`}
                        >
                          <Volume2 className={`w-4 h-4 ${isSpeaking ? "animate-pulse" : ""}`} />
                        </button>
                        {w.jlpt_level && (
                          <span
                            className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${JLPT_BADGE[w.jlpt_level] || "bg-gray-100 text-gray-500"}`}
                          >
                            {w.jlpt_level}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Hiragana */}
                    <p className="text-lg font-jp font-semibold text-primary-600 dark:text-primary-400">
                      {w.hiragana}
                    </p>
                  </div>
                </div>

                {/* Meanings */}
                <div className="relative z-10 flex-1 flex flex-col">
                  {/* Romaji */}
                  <div className="mb-3 space-y-1">
                    <p className="text-sm italic text-gray-500 dark:text-gray-400">{w.romaji}</p>
                    {showHindi && w.romaji_hindi && (
                      <p className="text-sm font-semibold text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20 px-2 py-0.5 rounded-md inline-flex items-center gap-1.5">
                        <span className="text-[10px]">🇮🇳</span> {w.romaji_hindi}
                      </p>
                    )}
                  </div>

                  <div className="mt-auto">
                    {/* English */}
                    <p className="text-base font-bold text-gray-800 dark:text-gray-100 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                      {w.english}
                    </p>
                    {/* Topic Name */}
                    <div className="flex items-center gap-1.5 mt-2.5 opacity-60 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px]">{TOPIC_ICONS[w.topic] || "📚"}</span>
                      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {w.topic}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sign-up CTA Banner ────────────────────── */}
      <div className="mt-16 rounded-3xl gradient-bg-primary p-8 text-center text-white relative overflow-hidden shadow-2xl neon-glow">
        <div className="absolute inset-0 jp-pattern opacity-10" />
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto">
          <p className="text-4xl mb-4 animate-float select-none">🎮</p>
          <h3 className="text-2xl sm:text-3xl font-bold mb-3">Ready to master these words?</h3>
          <p className="text-base text-white/80 mb-8 leading-relaxed">
            Create a free account to unlock interactive quizzes, spaced repetition flashcards,
            speaking practice, and climb the XP leaderboards.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-primary-600 font-bold text-sm shadow-xl hover:scale-105 hover:bg-gray-50 transition-all duration-300 transform active:scale-95"
          >
            Start Practicing Free
            <span className="text-xl">→</span>
          </Link>
        </div>
      </div>
    </>
  );
}
