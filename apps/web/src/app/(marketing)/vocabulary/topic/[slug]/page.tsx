import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import { VocabPublicClient } from "@/components/vocabulary-public-client";
import Link from "next/link";

export const revalidate = 3600;

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

// Converts slug → topic name
// Key mapping: slug → real topic name
function buildTopicSlugMap(topics: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  topics.forEach((t) => {
    const slug = t.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    map[slug] = t;
  });
  return map;
}

type Params = { slug: string };
type PageProps = { params: Promise<Params> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createStaticClient();
  const { data: topics } = await supabase.from("vocabulary").select("topic").order("topic");
  const uniqueTopics = [...new Set((topics ?? []).map((r: { topic: string }) => r.topic))];
  const slugMap = buildTopicSlugMap(uniqueTopics);
  const topicName = slugMap[slug];
  if (!topicName) return { title: "Not Found" };

  return {
    title: `Japanese ${topicName} Vocabulary — JLPT Words | JapanGoLearn`,
    description: `Learn Japanese ${topicName} vocabulary with kanji, hiragana, romaji, Hindi pronunciation, and audio. Free Japanese ${topicName.toLowerCase()} word list.`,
    alternates: { canonical: `https://japangolearn.com/vocabulary/topic/${slug}` },
    openGraph: {
      title: `Japanese ${topicName} Vocabulary | JapanGoLearn`,
      description: `${topicName} vocabulary in Japanese — kanji, hiragana, romaji, and Hindi pronunciation for each word.`,
      url: `https://japangolearn.com/vocabulary/topic/${slug}`,
    },
  };
}

export async function generateStaticParams() {
  const supabase = createStaticClient();
  const { data } = await supabase.from("vocabulary").select("topic");
  const unique = [...new Set((data ?? []).map((r: { topic: string }) => r.topic))];
  return unique.map((t) => ({ slug: t.toLowerCase().replace(/[^a-z0-9]+/g, "-") }));
}

export default async function TopicPage({ params }: PageProps) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: allTopicRows } = await supabase.from("vocabulary").select("topic");
  const uniqueTopics = [...new Set((allTopicRows ?? []).map((r: { topic: string }) => r.topic))];
  const slugMap = buildTopicSlugMap(uniqueTopics);
  const topicName = slugMap[slug];

  if (!topicName) notFound();

  const { data: words } = await supabase
    .from("vocabulary")
    .select("id, kanji, hiragana, romaji, romaji_hindi, english, topic, jlpt_level, icon")
    .eq("topic", topicName)
    .order("id");

  const allWords = words ?? [];
  const icon = TOPIC_ICONS[topicName] || "📚";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: `Japanese ${topicName} Vocabulary`,
    description: `Japanese vocabulary words related to ${topicName}`,
    url: `https://japangolearn.com/vocabulary/topic/${slug}`,
    inDefinedTermSet: "https://japangolearn.com/vocabulary",
    numberOfItems: allWords.length,
  };

  return (
    <div className="vocab-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="vp-hero py-14 lg:py-20 relative overflow-hidden">
        <div className="absolute inset-0 jp-pattern opacity-30" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/vocabulary"
            className="inline-flex items-center gap-1.5 text-sm vp-text-sub hover:text-primary-600 mb-6 transition-colors font-medium"
          >
            ← All Vocabulary
          </Link>
          <div className="flex items-center gap-5 mb-5">
            <div className="w-16 h-16 rounded-2xl gradient-bg-primary flex items-center justify-center text-3xl shadow-md text-white">
              {icon}
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold vp-text">
                Japanese <span className="gradient-text">{topicName}</span> Vocabulary
              </h1>
              <p className="vp-text-sub text-lg mt-1">{allWords.length} words · JLPT N5–N1</p>
            </div>
          </div>
          <p className="vp-text-sub max-w-2xl mb-8 leading-relaxed text-[15px]">
            Learn Japanese {topicName.toLowerCase()} vocabulary with kanji, hiragana reading, romaji
            transliteration, Hindi pronunciation, and audio playback.
          </p>
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

      {/* Vocabulary section */}
      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <VocabPublicClient words={allWords} initialTopic={topicName} />
        </div>
      </section>
    </div>
  );
}
