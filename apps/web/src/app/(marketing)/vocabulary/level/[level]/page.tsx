import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VocabPublicClient } from "@/components/vocabulary-public-client";
import Link from "next/link";

export const revalidate = 3600;

const LEVEL_INFO: Record<
  string,
  { label: string; desc: string; emoji: string; color: string; kanji: number; grammar: number }
> = {
  n5: {
    label: "N5 — Beginner",
    desc: "The most basic level. Learn Hiragana, Katakana, and ~100 essential Kanji. Master everyday phrases and basic grammar.",
    emoji: "🌱",
    color: "from-emerald-500 to-teal-600",
    kanji: 100,
    grammar: 65,
  },
  n4: {
    label: "N4 — Elementary",
    desc: "Expand your vocabulary to ~300 Kanji and basic conversational grammar suitable for simple daily conversations.",
    emoji: "📗",
    color: "from-blue-500 to-indigo-600",
    kanji: 300,
    grammar: 144,
  },
  n3: {
    label: "N3 — Intermediate",
    desc: "Master ~650 Kanji and conversational Japanese. Understand topics encountered in everyday life.",
    emoji: "📘",
    color: "from-violet-500 to-purple-600",
    kanji: 650,
    grammar: 188,
  },
  n2: {
    label: "N2 — Upper-Intermediate",
    desc: "Learn ~1,000 Kanji and read Japanese news and articles. Suitable for most professional environments.",
    emoji: "📙",
    color: "from-orange-500 to-amber-600",
    kanji: 1000,
    grammar: 196,
  },
  n1: {
    label: "N1 — Advanced",
    desc: "Achieve near-native mastery with 2,000+ Kanji. Understand complex texts, literature, and nuanced expressions.",
    emoji: "📕",
    color: "from-red-500 to-rose-600",
    kanji: 2000,
    grammar: 218,
  },
};

type Params = { level: string };
type PageProps = { params: Promise<Params> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { level } = await params;
  const info = LEVEL_INFO[level.toLowerCase()];
  if (!info) return { title: "Not Found" };
  const lvl = level.toUpperCase();
  return {
    title: `JLPT ${lvl} Vocabulary List — Japanese ${info.label} | JapanGoLearn`,
    description: `Complete JLPT ${lvl} Japanese vocabulary list with kanji, hiragana, romaji, and Hindi pronunciation. ${info.desc}`,
    alternates: { canonical: `https://japangolearn.com/vocabulary/level/${level.toLowerCase()}` },
    openGraph: {
      title: `JLPT ${lvl} Japanese Vocabulary List | JapanGoLearn`,
      description: `${info.desc} Browse all ${lvl} words with audio pronunciation and Hindi transliteration.`,
      url: `https://japangolearn.com/vocabulary/level/${level.toLowerCase()}`,
    },
  };
}

export async function generateStaticParams() {
  return ["n5", "n4", "n3", "n2", "n1"].map((level) => ({ level }));
}

export default async function JlptLevelPage({ params }: PageProps) {
  const { level } = await params;
  const levelLower = level.toLowerCase();
  const info = LEVEL_INFO[levelLower];
  if (!info) notFound();

  const levelUpper = level.toUpperCase() as "N5" | "N4" | "N3" | "N2" | "N1";
  const supabase = await createClient();
  const { data: words } = await supabase
    .from("vocabulary")
    .select("id, kanji, hiragana, romaji, romaji_hindi, english, topic, jlpt_level, icon")
    .eq("jlpt_level", levelUpper)
    .order("id");

  const allWords = words ?? [];

  // JSON-LD for this level page
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: `JLPT ${levelUpper} Japanese Vocabulary`,
    description: info.desc,
    url: `https://japangolearn.com/vocabulary/level/${levelLower}`,
    inDefinedTermSet: "https://japangolearn.com/vocabulary",
    numberOfItems: allWords.length,
  };

  const levels = ["N5", "N4", "N3", "N2", "N1"];

  return (
    <div className="vocab-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="vp-hero py-14 lg:py-20 relative overflow-hidden">
        <div className="absolute inset-0 jp-pattern opacity-30" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/vocabulary"
            className="inline-flex items-center gap-1.5 text-sm vp-text-sub hover:text-primary-600 mb-6 transition-colors font-medium"
          >
            ← All Vocabulary
          </Link>
          <div className="flex items-center gap-5 mb-5">
            <div
              className={`w-16 h-16 rounded-2xl bg-linear-to-br ${info.color} flex items-center justify-center text-white font-bold text-2xl shadow-md`}
            >
              {levelUpper}
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold vp-text">
                JLPT <span className="gradient-text">{levelUpper}</span> Vocabulary
              </h1>
              <p className="vp-text-sub text-lg mt-1">{info.label}</p>
            </div>
          </div>
          <p className="vp-text-sub max-w-2xl mb-8 leading-relaxed text-[15px]">{info.desc}</p>
          <div className="flex flex-wrap gap-2.5 text-sm">
            {[
              { icon: "📚", label: `${allWords.length} words` },
              { icon: "🔊", label: "Audio Pronunciation" },
              { icon: "🇮🇳", label: "Hindi Romaji" },
            ].map(({ icon, label }) => (
              <span key={label} className="vp-pill px-3.5 py-1.5 text-xs font-semibold">
                {icon} {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Level navigation (Sticky) */}
      <section className="vp-sticky-nav py-3.5 sticky top-0 z-20 shadow-sm backdrop-blur-md bg-opacity-90">
        <div className="mx-auto max-w-5xl px-4 flex gap-2 overflow-x-auto no-scrollbar">
          {levels.map((lvl) => (
            <Link
              key={lvl}
              href={`/vocabulary/level/${lvl.toLowerCase()}`}
              className={`vp-pill px-5 py-2 text-sm font-semibold whitespace-nowrap ${
                lvl === levelUpper ? "active scale-105 shadow-md" : "hover:border-primary-300"
              }`}
            >
              JLPT {lvl}
            </Link>
          ))}
        </div>
      </section>

      {/* Vocabulary section */}
      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <VocabPublicClient words={allWords} initialLevel={levelUpper} />
        </div>
      </section>
    </div>
  );
}
