"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";

/* Kanji of the Day used to be a hardcoded array of seven rotating by weekday,
   unrelated to the kanji table or the learner's level. The character now comes
   from the database; only the card's gradient is chosen here, cycled by id so a
   given kanji always looks the same. */
const KANJI_GRADIENTS = [
  "from-cyan-400 to-blue-500",
  "from-orange-400 to-red-500",
  "from-green-400 to-emerald-500",
  "from-yellow-400 to-amber-500",
  "from-violet-400 to-purple-500",
  "from-pink-400 to-rose-500",
  "from-teal-400 to-cyan-600",
];

const MOTIVATIONAL_QUOTES = [
  { jp: "継続は力なり", en: "Persistence is power." },
  { jp: "七転び八起き", en: "Fall seven times, stand up eight." },
  { jp: "一期一会", en: "One lifetime, one encounter — treasure it." },
  { jp: "石の上にも三年", en: "Three years on a stone — patience brings results." },
  { jp: "千里の道も一歩から", en: "A journey of a thousand miles begins with one step." },
];

export type HeroKanji = {
  id: number;
  glyph: string;
  meaning: string;
  reading: string | null;
  jlptLevel: string;
  strokeCount: number;
};

export type HeroResume = {
  label: string;
  href: string;
};

interface WelcomeHeroProps {
  displayName: string;
  xp: number;
  streak: number;
  jlptLevel: string;
  dailyXpEarned: number;
  dailyXpTarget: number;
  /** Drawn from the kanji table by the server; null when the table is empty. */
  dailyKanji: HeroKanji | null;
  /** Last completed activity, so the CTA continues it instead of a fixed link. */
  resume: HeroResume | null;
  /** Banked streak freezes, earned one per completed week. */
  streakFreezes: number;
}

export function WelcomeHero({
  displayName,
  streak,
  jlptLevel,
  dailyXpEarned,
  dailyXpTarget,
  dailyKanji,
  resume,
  streakFreezes,
}: WelcomeHeroProps) {
  const [kanjiFlipped, setKanjiFlipped] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Quote and greeting follow the reader's own clock, so they resolve after
  // mount; the kanji no longer does, because it now arrives from the server.
  const dayIndex = mounted ? new Date().getDay() : 0;
  const quote = MOTIVATIONAL_QUOTES[dayIndex % MOTIVATIONAL_QUOTES.length];
  const gradient = KANJI_GRADIENTS[(dailyKanji?.id ?? 0) % KANJI_GRADIENTS.length];

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

      <div className="relative flex flex-col gap-5 p-5 sm:gap-6 sm:p-8 lg:flex-row lg:items-center">
        {/* Left content */}
        <div className="min-w-0 flex-1 order-2 lg:order-1">
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
            {streakFreezes > 0 && (
              <>
                {" "}
                ·{" "}
                <span
                  className="font-semibold text-cyan-500"
                  title="A freeze is spent automatically if you miss a day. You earn one per week of streak, up to two."
                >
                  🧊 {streakFreezes} freeze{streakFreezes === 1 ? "" : "s"}
                </span>
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

          {/* CTAs — full width on phones so they are easy to hit */}
          <div className="grid grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
            <Link
              href={resume?.href ?? "/dashboard/levels"}
              className="gradient-bg-primary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 hover:shadow-lg sm:py-2.5"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              {resume ? `Continue ${resume.label}` : "Start Learning"}
            </Link>
            <Link
              href="/dashboard/analytics"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-200 sm:py-2.5 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              View Progress
            </Link>
          </div>
        </div>

        {/* Kanji of the Day Widget — a compact row on phones, a column beside
            the greeting from large screens up. Hidden entirely when the kanji
            table has nothing to show, rather than falling back to a fixed
            character that would misrepresent the curriculum. */}
        {dailyKanji && (
          <div className="order-1 flex shrink-0 flex-row items-center gap-4 lg:order-2 lg:flex-col lg:gap-3">
            <p className="hidden text-xs font-semibold uppercase tracking-wider text-gray-400 lg:block">
              Kanji of the Day
            </p>

            {/* Flip card */}
            <button
              type="button"
              className="relative shrink-0 cursor-pointer select-none"
              style={{ perspective: "600px", width: 96, height: 96 }}
              onClick={() => setKanjiFlipped((f) => !f)}
              aria-label={`Kanji of the day: ${dailyKanji.glyph}. Tap to reveal the meaning.`}
            >
              {/* Front */}
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} flex flex-col items-center justify-center text-white shadow-lg transition-all duration-500`}
                style={{
                  backfaceVisibility: "hidden",
                  transform: kanjiFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
              >
                <span className="font-jp text-4xl font-bold drop-shadow sm:text-5xl" lang="ja">
                  {dailyKanji.glyph}
                </span>
                <span className="mt-1 text-[10px] font-medium opacity-80">tap to flip</span>
              </div>

              {/* Back */}
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-2 text-center text-white shadow-lg transition-all duration-500`}
                style={{
                  backfaceVisibility: "hidden",
                  transform: kanjiFlipped ? "rotateY(0deg)" : "rotateY(-180deg)",
                }}
              >
                <span className="text-sm font-bold leading-tight sm:text-base">
                  {dailyKanji.meaning}
                </span>
                {dailyKanji.reading && (
                  <span className="font-jp mt-1 text-[11px] opacity-90" lang="ja">
                    {dailyKanji.reading}
                  </span>
                )}
              </div>
            </button>

            <div className="min-w-0 lg:text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 lg:hidden">
                Kanji of the Day
              </p>
              <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                {dailyKanji.jlptLevel} · {dailyKanji.strokeCount} strokes
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
