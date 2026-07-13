import type { Metadata } from "next";
import { BookOpen, Users, Heart, Target, Sparkles, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about JapanGoLearn's mission to make Japanese language learning accessible, visual, and fun for everyone.",
  alternates: {
    canonical: "https://japangolearn.com/about",
  },
};

const values = [
  {
    icon: BookOpen,
    title: "Visual Learning",
    description:
      "We believe seeing is understanding. Every concept is presented visually before text explanations.",
  },
  {
    icon: Heart,
    title: "Joy-Driven",
    description:
      "Learning should be fun. Gamification, achievements, and beautiful design keep you motivated.",
  },
  {
    icon: Users,
    title: "Community First",
    description:
      "Learn together. Compete on leaderboards, share progress, and encourage each other.",
  },
  {
    icon: Target,
    title: "Goal-Oriented",
    description:
      "Structured JLPT paths give you clear milestones and measurable progress toward fluency.",
  },
  {
    icon: Sparkles,
    title: "AI-Powered",
    description:
      "Personalized learning with Google Gemini AI adapts to your pace and focuses on your weak areas.",
  },
  {
    icon: Globe,
    title: "Cultural Depth",
    description:
      "Language lives in culture. Explore Japan through 3D scenes, customs, and real-world context.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative py-20 lg:py-28 gradient-bg-hero overflow-hidden">
        <div className="absolute inset-0 jp-pattern opacity-40" />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            About <span className="gradient-text">JapanGoLearn</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            We&apos;re on a mission to make Japanese accessible to everyone through modern
            technology, beautiful design, and the science of gamified learning.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <h2 className="text-3xl font-bold mb-6 gradient-text">Our Story</h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
              Japanese is one of the most beautiful and complex languages in the world. With three
              writing systems (Hiragana, Katakana, and Kanji), intricate grammar, and cultural
              nuances, traditional learning methods often feel overwhelming.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
              JapanGoLearn was born from a simple idea:{" "}
              <strong className="text-primary-600 dark:text-primary-400">
                what if learning Japanese felt like playing a game?
              </strong>{" "}
              We combine animated kanji stroke orders, visual mnemonics, AI conversation practice,
              and 3D cultural exploration to create an experience that&apos;s as engaging as it is
              effective.
            </p>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Our structured JLPT path takes you from absolute beginner (N5) to native-level
              proficiency (N1), with every lesson designed to keep you motivated and moving forward.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 lg:py-24 bg-gray-50 dark:bg-gray-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">
            Our <span className="gradient-text">Values</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {values.map((value) => (
              <div
                key={value.title}
                className="p-6 rounded-2xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-300 hover:-translate-y-1"
              >
                <value.icon className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
