import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Sparkles, Mic, MessageSquare, Volume2, BookOpen, Star } from "lucide-react";
import { featureFlags } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

const TOPICS = [
  { id: "greetings", label: "Greetings & Intro", icon: "👋", level: "N5", unlocked: true },
  { id: "food", label: "Food & Ordering", icon: "🍱", level: "N5", unlocked: true },
  { id: "travel", label: "Travel & Directions", icon: "🗾", level: "N5", unlocked: true },
  { id: "shopping", label: "Shopping", icon: "🛍️", level: "N4", unlocked: true },
  { id: "weather", label: "Weather & Seasons", icon: "🌸", level: "N4", unlocked: true },
  { id: "work", label: "Work & Business", icon: "💼", level: "N3", unlocked: false },
  { id: "culture", label: "Culture & Traditions", icon: "⛩️", level: "N3", unlocked: false },
  { id: "debate", label: "Opinions & Debate", icon: "💬", level: "N2", unlocked: false },
];

const PRACTICE_MODES = [
  {
    id: "conversation",
    icon: MessageSquare,
    title: "Free Conversation",
    description: "Open-ended chat with your AI tutor on any topic",
    color: "from-violet-400 to-purple-500",
    premium: true,
  },
  {
    id: "speaking",
    icon: Mic,
    title: "Speaking Practice",
    description: "Practice pronunciation and get instant feedback",
    color: "from-pink-400 to-rose-500",
    premium: true,
  },
  {
    id: "listening",
    icon: Volume2,
    title: "Listening Comprehension",
    description: "Listen to AI-generated passages and answer questions",
    color: "from-cyan-400 to-blue-500",
    premium: true,
  },
  {
    id: "roleplay",
    icon: BookOpen,
    title: "Role Play Scenarios",
    description: "Practice real-life situations like restaurant ordering",
    color: "from-amber-400 to-orange-500",
    premium: false,
  },
];

export default async function AiPracticePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!featureFlags.aiPractice || !featureFlags.premium) {
    redirect("/dashboard?feature=ai-practice-unavailable");
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link href="/dashboard" className="hover:text-primary-600 transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-medium text-gray-900 dark:text-gray-100">AI Practice</span>
      </div>

      {/* Hero Banner */}
      <section
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8 mb-8 border-2 border-primary-300 dark:border-primary-600"
        style={{ boxShadow: "0 0 30px rgba(124,58,237,0.2), 0 0 60px rgba(124,58,237,0.08)" }}
      >
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-accent-500/5 to-sakura-500/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-sakura-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary-500 animate-pulse" />
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg gradient-bg-primary text-white tracking-wide">
                PREMIUM FEATURE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              AI <span className="gradient-text">Conversation</span> Practice
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-5 max-w-lg">
              Practice real Japanese conversations with our AI tutor powered by Google Gemini. Get
              instant feedback on grammar, pronunciation, and natural expression.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/ai-practice/chat?topic=free-conversation"
                className="inline-flex items-center gap-2 gradient-bg-primary text-white text-sm font-semibold px-5 py-3 rounded-xl hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              >
                <Mic className="w-4 h-4" />
                Start Conversation
              </Link>
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-gray-600 dark:text-gray-300">
                  Last Score: <strong>—/100</strong>
                </span>
              </div>
            </div>
          </div>

          {/* AI mascot */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className="w-28 h-28 rounded-3xl gradient-bg-primary flex items-center justify-center shadow-2xl relative group">
              <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
                🤖
              </span>
              {/* Pulsing ring */}
              <div
                className="absolute inset-0 rounded-3xl border-2 border-primary-400/50 animate-ping pointer-events-none"
                style={{ animationDuration: "2s" }}
              />
            </div>
            <p className="text-xs text-gray-400 font-medium">Sensei AI</p>
          </div>
        </div>
      </section>

      {/* Practice Modes */}
      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">Practice Modes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PRACTICE_MODES.map((mode) => (
            <div
              key={mode.id}
              className="group relative p-5 rounded-2xl bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mode.color} text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}
                >
                  <mode.icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{mode.title}</h3>
                    {mode.premium && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md gradient-bg-primary text-white">
                        PRO
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{mode.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Topic Selection */}
      <section>
        <h2 className="text-xl font-bold mb-1">Conversation Topics</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Choose a topic to practice — unlock more as you level up
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TOPICS.map((topic) => {
            const inner = (
              <div
                key={topic.id}
                className={`group p-4 rounded-2xl border transition-all duration-200 ${
                  topic.unlocked
                    ? "bg-white dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-700 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                    : "bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-2xl ${!topic.unlocked ? "grayscale" : ""} group-hover:scale-110 transition-transform`}
                  >
                    {topic.unlocked ? topic.icon : "🔒"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{topic.label}</p>
                    <p className="text-xs text-gray-400">{topic.level}</p>
                  </div>
                </div>
              </div>
            );

            return topic.unlocked ? (
              <Link key={topic.id} href={`/dashboard/ai-practice/chat?topic=${topic.id}`}>
                {inner}
              </Link>
            ) : (
              inner
            );
          })}
        </div>
      </section>

      {/* Bottom note */}
      <div className="mt-10 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500 font-jp">
          練習は完璧を生む — Practice makes perfect.
        </p>
      </div>
    </div>
  );
}
