import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { VocabPublicClient } from "@/components/vocabulary-public-client";
import Link from "next/link";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Japanese Vocabulary List — N5 to N1 | JapanGoLearn",
  description:
    "Free Japanese vocabulary list with kanji, hiragana, romaji, Hindi pronunciation, and audio. Browse by JLPT level (N5–N1) or topic. Learn Japanese vocabulary online.",
  alternates: { canonical: "https://japangolearn.com/vocabulary" },
  openGraph: {
    title: "Japanese Vocabulary List — N5 to N1 | JapanGoLearn",
    description:
      "Free Japanese vocabulary with kanji, hiragana, romaji, Hindi, and pronunciation audio. Filter by JLPT level or topic.",
    url: "https://japangolearn.com/vocabulary",
    type: "website",
  },
};

const JLPT_LEVELS = [
  {
    level: "N5",
    desc: "Beginner",
    emoji: "🌱",
    color: "from-emerald-500 to-teal-600",
    shadow: "hover:shadow-emerald-500/20",
  },
  {
    level: "N4",
    desc: "Elementary",
    emoji: "📗",
    color: "from-blue-500 to-indigo-600",
    shadow: "hover:shadow-blue-500/20",
  },
  {
    level: "N3",
    desc: "Intermediate",
    emoji: "📘",
    color: "from-violet-500 to-purple-600",
    shadow: "hover:shadow-violet-500/20",
  },
  {
    level: "N2",
    desc: "Upper-Int.",
    emoji: "📙",
    color: "from-orange-500 to-amber-600",
    shadow: "hover:shadow-orange-500/20",
  },
  {
    level: "N1",
    desc: "Advanced",
    emoji: "📕",
    color: "from-red-500 to-rose-600",
    shadow: "hover:shadow-red-500/20",
  },
];

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

export default async function VocabularyPage() {
  const supabase = await createClient();

  const { data: words } = await supabase
    .from("vocabulary")
    .select("id, kanji, hiragana, romaji, romaji_hindi, english, topic, jlpt_level, icon")
    .order("id");

  const allWords = words ?? [];
  const totalWords = allWords.length;
  const topics = [...new Set(allWords.map((w) => w.topic))].sort();

  const levelCounts: Record<string, number> = {};
  allWords.forEach((w) => {
    if (w.jlpt_level) levelCounts[w.jlpt_level] = (levelCounts[w.jlpt_level] || 0) + 1;
  });

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark transition-colors duration-300">
      {/* ── Hero ───────────────────────────────────────── */}
      <section className="gradient-bg-hero py-16 lg:py-24 relative overflow-hidden border-b border-gray-200 dark:border-gray-800">
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 jp-pattern opacity-40 dark:opacity-20" />

        {/* Decorative dynamic glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 dark:bg-primary-500/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/10 dark:bg-accent-500/20 rounded-full blur-3xl pointer-events-none translate-y-1/2" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Large Japanese char */}
          <p className="text-6xl sm:text-7xl font-jp mb-4 select-none opacity-20 dark:opacity-10 text-primary-600 dark:text-primary-400 font-bold">
            語彙
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
            Japanese <span className="gradient-text">Vocabulary</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Master over{" "}
            <span className="text-primary-600 dark:text-primary-400 font-bold">
              {totalWords.toLocaleString()}
            </span>{" "}
            dynamic words featuring kanji, hiragana, romaji, Hindi translations, and real
            pronunciation audio.
          </p>

          {/* Stat chips */}
          <div className="flex flex-wrap justify-center gap-3 text-sm">
            {[
              { icon: "📚", label: `${totalWords} words` },
              { icon: "📂", label: `${topics.length} topics` },
              { icon: "🎓", label: "JLPT N5 → N1" },
              { icon: "🔊", label: "Audio Pronunciation" },
              { icon: "🇮🇳", label: "Hindi Support" },
            ].map(({ icon, label }) => (
              <span
                key={label}
                className="px-4 py-2 rounded-full glass-card text-gray-800 dark:text-gray-200 font-semibold shadow-sm border border-gray-200 dark:border-gray-700 backdrop-blur-md"
              >
                {icon} {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── JLPT Levels ────────────────────────────────── */}
      <section className="py-16 relative">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Browse by <span className="gradient-text">JLPT Level</span>
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-gray-800 to-transparent" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {JLPT_LEVELS.map(({ level, desc, color, shadow }) => (
              <Link
                key={level}
                href={`/vocabulary/level/${level.toLowerCase()}`}
                className={`glass-card group flex flex-col items-center p-6 rounded-3xl border border-gray-200 dark:border-gray-800 text-center hover:border-primary-400 dark:hover:border-primary-500 hover:-translate-y-1 transition-all duration-300 ${shadow} neon-glow`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-linear-to-br ${color} flex items-center justify-center text-white font-bold text-xl mb-3 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-lg`}
                >
                  {level}
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{level}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{desc}</p>
                <div className="mt-3 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800/50 text-xs font-semibold text-primary-600 dark:text-primary-400">
                  {levelCounts[level] || 0} words
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Topics ─────────────────────────────────────── */}
      <section className="py-10 bg-gray-50/50 dark:bg-gray-900/30 border-y border-gray-200 dark:border-gray-800 overflow-hidden relative">
        <div className="absolute right-0 top-0 w-64 h-64 bg-accent-500/5 dark:bg-accent-500/10 rounded-full blur-3xl" />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Explore <span className="gradient-text">Topics</span>
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-gray-800 to-transparent" />
          </div>
          <div className="flex flex-wrap gap-2.5">
            {topics.map((topic) => {
              const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-");
              const count = allWords.filter((w) => w.topic === topic).length;
              return (
                <Link
                  key={topic}
                  href={`/vocabulary/topic/${slug}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-primary-400 dark:hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-200"
                >
                  <span className="text-lg">{TOPIC_ICONS[topic] || "📚"}</span>
                  {topic}
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full text-xs ml-1">
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── All words browser ──────────────────────────── */}
      <section className="py-16 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between flex-wrap gap-4 items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Vocabulary <span className="gradient-text">Library</span>
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Search and filter through the complete collection.
              </p>
            </div>
          </div>
          <VocabPublicClient words={allWords} />
        </div>
      </section>
    </div>
  );
}
