import type { Metadata } from "next";
import { createStaticClient } from "@/lib/supabase/static";
import Link from "next/link";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Hiragana Chart — Japanese Alphabet with Hindi Pronunciation | JapanGoLearn",
  description:
    "Learn all 46 Hiragana characters with romaji, Hindi pronunciation (हिंदी उच्चारण), and stroke hints. Free complete Hiragana chart for beginners. Master Japanese alphabet fast.",
  keywords: [
    "hiragana chart",
    "hiragana in hindi",
    "hiragana pronunciation",
    "japanese alphabet hiragana",
    "hiragana for beginners",
    "learn hiragana",
    "hiragana with hindi meaning",
    "japanese hiragana chart hindi",
    "hiragana romaji",
    "hiragana complete table",
  ],
  alternates: { canonical: "https://japangolearn.com/hiragana" },
  openGraph: {
    title: "Hiragana Chart with Hindi Pronunciation | JapanGoLearn",
    description:
      "Complete Hiragana chart with romaji and Hindi pronunciation. Learn Japanese script from scratch — perfect for Hindi speakers.",
    url: "https://japangolearn.com/hiragana",
    type: "website",
  },
};

type KanaChar = {
  id: number;
  character: string;
  romaji: string;
  romaji_hindi: string;
  group_name: string;
  stroke_count: number;
  stroke_hint: string;
  sort_order: number;
  is_dakuten: boolean;
  is_combo: boolean;
  icon: string;
};

export default async function HiraganaPage() {
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("kana")
    .select(
      "id, character, romaji, romaji_hindi, group_name, stroke_count, stroke_hint, sort_order, is_dakuten, is_combo, icon"
    )
    .eq("type", "hiragana")
    .order("sort_order");

  const allChars: KanaChar[] = data ?? [];
  const totalChars = allChars.length;

  // Group by group_name preserving order
  const groupMap = new Map<string, KanaChar[]>();
  allChars.forEach((c) => {
    if (!groupMap.has(c.group_name)) groupMap.set(c.group_name, []);
    groupMap.get(c.group_name)!.push(c);
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Hiragana Chart — Japanese Alphabet",
    description: "Complete Hiragana chart with romaji and Hindi pronunciation for all characters",
    url: "https://japangolearn.com/hiragana",
    numberOfItems: totalChars,
  };

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="gradient-bg-hero py-16 lg:py-24 relative overflow-hidden border-b border-gray-200 dark:border-gray-800">
        <div className="absolute inset-0 jp-pattern opacity-40 dark:opacity-20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/10 dark:bg-pink-500/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/20 rounded-full blur-3xl pointer-events-none translate-y-1/2" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-7xl sm:text-8xl font-jp mb-4 select-none opacity-20 dark:opacity-10 text-pink-500 font-bold">
            あ
          </p>
          <h1 className="text-4xl sm:text-6xl font-bold mb-6 text-gray-900 dark:text-white">
            Japanese <span className="gradient-text">Hiragana</span> Chart
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Master all{" "}
            <span className="text-pink-500 dark:text-pink-400 font-bold">
              {totalChars} Hiragana characters
            </span>{" "}
            with romaji, Hindi pronunciation, and stroke order hints. The foundation of reading
            Japanese.
          </p>

          {/* Stats chips */}
          <div className="flex flex-wrap justify-center gap-3 text-sm mb-8">
            {[
              { icon: "🔤", label: `${totalChars} Characters` },
              { icon: "🇮🇳", label: "Hindi Pronunciation" },
              { icon: "🖊️", label: "Stroke Order Hints" },
              { icon: "⚡", label: "Dakuten & Combos" },
            ].map(({ icon, label }) => (
              <span
                key={label}
                className="px-4 py-2 rounded-full glass-card text-gray-800 dark:text-gray-200 font-semibold shadow-sm border border-gray-200 dark:border-gray-700 backdrop-blur-md"
              >
                {icon} {label}
              </span>
            ))}
          </div>

          {/* Breadcrumb */}
          <div className="flex justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link href="/" className="hover:text-pink-500 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-800 dark:text-gray-200 font-medium">Hiragana</span>
          </div>
        </div>
      </section>

      {/* ── What is Hiragana ─────────────────────────────── */}
      <section className="py-12 bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="glass-card rounded-3xl p-8 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              What is <span className="gradient-text">Hiragana?</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              Hiragana (ひらがな) is one of the three Japanese writing systems. It consists of 46
              basic characters, each representing a syllable. Hiragana is used for native Japanese
              words, grammatical particles, verb endings, and to write words that don&apos;t have
              kanji.
            </p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              For Hindi speakers, learning Hiragana is surprisingly intuitive since both scripts are
              phonetic — each character has a fixed sound. Master these characters first and
              you&apos;ll be able to read a huge portion of Japanese text!
            </p>
          </div>
        </div>
      </section>

      {/* ── Character Groups ─────────────────────────────── */}
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-14">
          {Array.from(groupMap.entries()).map(([groupName, chars]) => {
            const isDakutenGroup = chars.some((c) => c.is_dakuten);
            const isComboGroup = chars.some((c) => c.is_combo);
            const groupColor = isDakutenGroup
              ? "from-purple-500 to-violet-600"
              : isComboGroup
                ? "from-amber-500 to-orange-600"
                : "from-pink-500 to-rose-600";

            return (
              <div key={groupName}>
                {/* Group Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${groupColor} text-white text-sm font-bold shadow-md`}
                  >
                    {groupName}
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-gray-700 to-transparent" />
                  <span className="text-xs text-gray-400 font-medium">{chars.length} chars</span>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  {chars.map((kana) => (
                    <div
                      key={kana.id}
                      className="group glass-card rounded-2xl p-3 text-center border border-gray-200 dark:border-gray-700 hover:border-pink-400 dark:hover:border-pink-500 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-pink-500/10 transition-all duration-300 cursor-default"
                      title={kana.stroke_hint}
                    >
                      {/* Japanese Character */}
                      <div className="text-4xl font-jp font-bold text-gray-900 dark:text-white mb-1.5 group-hover:scale-110 transition-transform duration-200">
                        {kana.character}
                      </div>
                      {/* Romaji */}
                      <div className="text-xs font-bold text-pink-500 dark:text-pink-400 uppercase tracking-wider mb-1">
                        {kana.romaji}
                      </div>
                      {/* Hindi */}
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-300 font-jp">
                        {kana.romaji_hindi}
                      </div>
                      {/* Stroke count badge */}
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-400">
                        <span>✏️</span>
                        <span>{kana.stroke_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Quick comparison table ───────────────────────── */}
      <section className="py-12 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-800">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Hiragana <span className="gradient-text">Quick Reference</span>
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-gray-200 dark:from-gray-800 to-transparent" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm glass-card rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <thead>
                <tr className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300">
                    Character
                  </th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300">
                    Romaji
                  </th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300">
                    Hindi (हिंदी)
                  </th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300">
                    Group
                  </th>
                  <th className="px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-300">
                    Strokes
                  </th>
                </tr>
              </thead>
              <tbody>
                {allChars
                  .filter((c) => !c.is_combo)
                  .map((kana, i) => (
                    <tr
                      key={kana.id}
                      className={`border-b border-gray-100 dark:border-gray-800 hover:bg-pink-50/50 dark:hover:bg-pink-900/10 transition-colors ${
                        i % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-gray-900/20"
                      }`}
                    >
                      <td className="px-4 py-2.5 text-2xl font-jp font-bold text-gray-900 dark:text-white">
                        {kana.character}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-pink-500 dark:text-pink-400 uppercase">
                        {kana.romaji}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300 font-jp">
                        {kana.romaji_hindi}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">
                        {kana.group_name}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">
                        {kana.stroke_count}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to <span className="gradient-text">Practice Hiragana?</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-xl mx-auto">
            Sign up for free and practice writing Hiragana with our interactive stroke-order trainer
            and quizzes.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold hover:opacity-90 hover:scale-105 transition-all duration-300 shadow-lg shadow-pink-500/30"
            >
              Start Learning Free →
            </Link>
            <Link
              href="/katakana"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl glass-card border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold hover:border-pink-400 dark:hover:border-pink-500 transition-all duration-300"
            >
              Learn Katakana →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
