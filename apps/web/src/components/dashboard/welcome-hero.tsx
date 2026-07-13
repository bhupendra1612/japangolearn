"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";

// Kanji of the day — 7 rotating by weekday
const DAILY_KANJI = [
  { char: "水", reading: "みず / スイ", meaning: "Water", color: "from-cyan-400 to-blue-500" },
  { char: "火", reading: "ひ / カ", meaning: "Fire", color: "from-orange-400 to-red-500" },
  {
    char: "木",
    reading: "き / モク",
    meaning: "Tree / Wood",
    color: "from-green-400 to-emerald-500",
  },
  {
    char: "金",
    reading: "かね / キン",
    meaning: "Gold / Money",
    color: "from-yellow-400 to-amber-500",
  },
  {
    char: "土",
    reading: "つち / ド",
    meaning: "Earth / Soil",
    color: "from-orange-300 to-yellow-600",
  },
  {
    char: "日",
    reading: "ひ / ニチ",
    meaning: "Sun / Day",
    color: "from-yellow-400 to-orange-400",
  },
  {
    char: "月",
    reading: "つき / ゲツ",
    meaning: "Moon / Month",
    color: "from-violet-400 to-purple-500",
  },
];

const MOTIVATIONAL_QUOTES = [
  { jp: "継続は力なり", en: "Persistence is power." },
  { jp: "七転び八起き", en: "Fall seven times, stand up eight." },
  { jp: "一期一会", en: "One lifetime, one encounter — treasure it." },
  { jp: "石の上にも三年", en: "Three years on a stone — patience brings results." },
  { jp: "千里の道も一歩から", en: "A journey of a thousand miles begins with one step." },
];

interface WelcomeHeroProps {
  displayName: string;
  xp: number;
  streak: number;
  jlptLevel: string;
  dailyXpEarned: number;
  dailyXpTarget: number;
}

export function WelcomeHero({
  displayName,
  streak,
  jlptLevel,
  dailyXpEarned,
  dailyXpTarget,
}: WelcomeHeroProps) {
  const [kanjiFlipped, setKanjiFlipped] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pick kanji and quote by day of week
  const dayIndex = mounted ? new Date().getDay() : 0;
  const kanji = DAILY_KANJI[dayIndex];
  const quote = MOTIVATIONAL_QUOTES[dayIndex % MOTIVATIONAL_QUOTES.length];

  // Time-aware greeting
  const hour = mounted ? new Date().getHours() : 12;
  const greeting =
    hour < 5 ? "こんばんは" : hour < 12 ? "おはよう" : hour < 17 ? "こんにちは" : "こんばんは";

  const progress = dailyXpTarget > 0 ? Math.min((dailyXpEarned / dailyXpTarget) * 100, 100) : 0;
  const firstName = displayName.split(" ")[0];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-sakura-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />
      <div className="absolute inset-0 jp-pattern opacity-20 pointer-events-none" />

      <div className="relative p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center gap-6">
        {/* Left content */}
        <div className="flex-1 min-w-0">
          {/* Quote */}
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1 font-jp italic">
            &ldquo;{quote.jp}&rdquo; — {quote.en}
          </p>

          {/* Greeting */}
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">
            <span className="font-jp text-primary-600 dark:text-primary-400">{greeting}</span>
            {", "}
            <span className="gradient-text">{firstName}</span>{" "}
            <span className="animate-wave inline-block origin-bottom-right">👋</span>
          </h1>

          {/* JLPT context */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            You&apos;re on{" "}
            <span className="font-semibold text-primary-600 dark:text-primary-400">
              JLPT {jlptLevel}
            </span>
            {streak > 0 && (
              <>
                {" "}
                · <span className="text-orange-500 font-semibold">🔥 {streak}-day streak!</span>
              </>
            )}
          </p>

          {/* daily goal progress */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Today&apos;s Goal</span>
              <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                {dailyXpEarned} / {dailyXpTarget} XP
              </span>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full gradient-bg-primary relative transition-all duration-1000 ease-out"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer rounded-full" />
              </div>
            </div>
            {progress >= 100 && (
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1.5">
                🎉 Daily goal complete!
              </p>
            )}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/levels"
              className="inline-flex items-center gap-2 gradient-bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <BookOpen className="w-4 h-4" />
              Continue Learning
            </Link>
            <Link
              href="/dashboard/analytics"
              className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
            >
              View Progress
            </Link>
          </div>
        </div>

        {/* Kanji of the Day Widget */}
        <div className="flex flex-col items-center shrink-0 gap-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Kanji of the Day
          </p>

          {/* Flip card */}
          <div
            className="relative cursor-pointer select-none"
            style={{ perspective: "600px", width: 120, height: 120 }}
            onClick={() => setKanjiFlipped((f) => !f)}
            title="Click to flip"
          >
            {/* Front */}
            <div
              className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${kanji.color} text-white flex flex-col items-center justify-center shadow-lg transition-all duration-500`}
              style={{
                backfaceVisibility: "hidden",
                transform: kanjiFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              <span className="text-5xl font-jp font-bold drop-shadow">{kanji.char}</span>
              <span className="text-[10px] font-medium mt-1 opacity-80">tap to flip</span>
            </div>

            {/* Back */}
            <div
              className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${kanji.color} text-white flex flex-col items-center justify-center shadow-lg transition-all duration-500 p-2 text-center`}
              style={{
                backfaceVisibility: "hidden",
                transform: kanjiFlipped ? "rotateY(0deg)" : "rotateY(-180deg)",
              }}
            >
              <span className="text-base font-bold leading-tight">{kanji.meaning}</span>
              <span className="text-[11px] mt-1 opacity-90 font-jp">{kanji.reading}</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500">
            {kanji.char} · {kanji.meaning}
          </p>
        </div>
      </div>
    </section>
  );
}
