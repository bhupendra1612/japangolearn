import type { Metadata } from "next";
import { BookOpen, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Tips, guides, and insights for learning Japanese — from kanji mnemonics to JLPT prep strategies.",
  alternates: {
    canonical: "https://japangolearn.com/blog",
  },
};

const placeholderPosts = [
  {
    title: "5 Tips to Memorize Kanji Faster",
    excerpt:
      "Discover proven techniques including visual mnemonics, spaced repetition, and stroke-order practice that make kanji stick.",
    date: "Coming Soon",
    category: "Kanji",
    emoji: "🎯",
  },
  {
    title: "JLPT N5 Study Guide: Where to Start",
    excerpt:
      "A complete beginner's roadmap covering hiragana, katakana, basic kanji, vocabulary, and grammar for the N5 exam.",
    date: "Coming Soon",
    category: "JLPT",
    emoji: "📚",
  },
  {
    title: "The Science Behind Gamified Learning",
    excerpt:
      "How XP, streaks, and leaderboards leverage dopamine and habit formation to supercharge your study sessions.",
    date: "Coming Soon",
    category: "Learning",
    emoji: "🧠",
  },
  {
    title: "Japanese Politeness Levels Explained",
    excerpt:
      "Master casual, polite, and formal speech patterns with clear examples and cultural context.",
    date: "Coming Soon",
    category: "Grammar",
    emoji: "🙇",
  },
  {
    title: "Top 10 Japanese Culture Facts for Language Learners",
    excerpt:
      "Understanding Japanese culture is key to understanding the language. Here are 10 essentials every learner should know.",
    date: "Coming Soon",
    category: "Culture",
    emoji: "🏯",
  },
  {
    title: "How AI is Revolutionizing Language Learning",
    excerpt:
      "From personalized lesson plans to real-time conversation practice, see how AI is changing the way we learn languages.",
    date: "Coming Soon",
    category: "Technology",
    emoji: "🤖",
  },
];

export default function BlogPage() {
  return (
    <>
      <section className="relative py-20 lg:py-28 gradient-bg-hero overflow-hidden">
        <div className="absolute inset-0 jp-pattern opacity-40" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="gradient-text">Blog</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Tips, guides, and insights to accelerate your Japanese learning journey.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {placeholderPosts.map((post) => (
              <article
                key={post.title}
                className="group p-6 rounded-2xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
              >
                <div className="text-4xl mb-4">{post.emoji}</div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded-md">
                    {post.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {post.date}
                  </span>
                </div>
                <h2 className="text-lg font-semibold mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {post.excerpt}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-6 py-3 rounded-xl text-sm">
              <BookOpen className="w-4 h-4" />
              More articles coming soon!
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
