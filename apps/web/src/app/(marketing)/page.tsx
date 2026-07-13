import Link from "next/link";
import {
  BookOpen,
  Sparkles,
  Trophy,
  Brain,
  Globe,
  ChevronRight,
  Star,
  Zap,
  Target,
  Languages,
} from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "Visual-First Learning",
    description:
      "Learn kanji and vocabulary through beautiful visual mnemonics and animated breakdowns.",
    color: "from-primary-500 to-indigo-600",
  },
  {
    icon: Sparkles,
    title: "SVG Stroke Animations",
    description:
      "Watch every kanji come alive with precise stroke-order animations you can practice along with.",
    color: "from-accent-400 to-cyan-600",
  },
  {
    icon: Trophy,
    title: "Gamified Progress",
    description:
      "Earn XP, maintain streaks, unlock achievements, and climb leaderboards as you learn.",
    color: "from-gold-400 to-amber-600",
  },
  {
    icon: Brain,
    title: "AI Conversation",
    description: "Practice real Japanese conversations with our AI tutor powered by Google Gemini.",
    color: "from-sakura-400 to-pink-600",
  },
  {
    icon: Globe,
    title: "3D Cultural Immersion",
    description:
      "Explore Japanese culture through interactive 3D scenes — temples, cities, and more.",
    color: "from-violet-500 to-fuchsia-600",
  },
  {
    icon: Target,
    title: "JLPT Structured Path",
    description:
      "Follow a clear progression from N5 (beginner) to N1 (advanced) aligned with official JLPT exams.",
    color: "from-teal-400 to-emerald-600",
  },
];

const jlptLevels = [
  {
    level: "N5",
    label: "Beginner",
    kanji: "入",
    color: "from-emerald-400 to-teal-600",
    desc: "Hiragana, Katakana, 100 Kanji",
  },
  {
    level: "N4",
    label: "Elementary",
    kanji: "学",
    color: "from-blue-400 to-indigo-600",
    desc: "300 Kanji, Basic Grammar",
  },
  {
    level: "N3",
    label: "Intermediate",
    kanji: "語",
    color: "from-violet-400 to-purple-600",
    desc: "650 Kanji, Conversational",
  },
  {
    level: "N2",
    label: "Upper-Intermediate",
    kanji: "読",
    color: "from-pink-400 to-rose-600",
    desc: "1000 Kanji, News & Articles",
  },
  {
    level: "N1",
    label: "Advanced",
    kanji: "極",
    color: "from-amber-400 to-orange-600",
    desc: "2000+ Kanji, Native Level",
  },
];

export default function HomePage() {
  return (
    <div className="bg-[#0b0f19] min-h-screen text-white overflow-hidden selection:bg-primary-500/30">
      {/* ===== GLOBAL BACKGROUND ORBS ===== */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] bg-accent-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] bg-violet-600/20 rounded-full blur-[150px]" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_20%,transparent_100%)]" />
      </div>

      {/* ===== HERO SECTION ===== */}
      <section className="relative z-10 py-24 lg:py-36">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-300 px-5 py-2 rounded-full text-sm font-medium mb-10 animate-scale-in backdrop-blur-md shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              <Star className="w-4 h-4 text-accent-400" />
              <span>Free to start • No credit card needed</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-7xl lg:text-[5.5rem] font-extrabold tracking-tight mb-8 animate-slide-up leading-[1.1]">
              Learn Japanese
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-accent-300 to-primary-400 animate-shimmer">
                the Modern Way
              </span>
            </h1>

            <p
              className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              Visual learning, animated kanji strokes, gamification, and AI-powered practice. Master
              JLPT levels from <span className="font-semibold text-white">N5 to N1</span> with
              confidence.
            </p>

            {/* CTA Buttons */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-accent-600 text-white font-bold px-10 py-4 rounded-2xl text-lg hover:scale-105 transition-all duration-300 neon-glow w-full sm:w-auto shadow-[0_0_40px_rgba(124,58,237,0.4)]"
              >
                <Zap className="w-5 h-5" />
                Start Learning Free
                <ChevronRight className="w-5 h-5" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 text-gray-300 font-medium px-10 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all duration-300 w-full sm:w-auto hover:text-white"
              >
                Learn More
              </Link>
            </div>

            {/* Stats */}
            <div
              className="mt-20 grid grid-cols-3 gap-8 max-w-2xl mx-auto p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl animate-slide-up shadow-2xl"
              style={{ animationDelay: "0.3s" }}
            >
              {[
                { value: "2,136", label: "Jōyō Kanji" },
                { value: "5", label: "JLPT Levels" },
                { value: "100%", label: "Free to Start" },
              ].map((stat) => (
                <div key={stat.label} className="text-center relative">
                  <p className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-500 drop-shadow-lg">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-400 mt-2 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== JLPT PATH SECTION (GLASSMORPHISM) ===== */}
      <section className="py-24 relative z-10 w-full overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 max-w-full">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold mb-5 tracking-tight">
              Your Path from{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-400 to-primary-400">
                N5 to N1
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Follow the structured JLPT progression. Each level builds on the previous, preparing
              you for the official exam.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-stretch justify-center gap-4 lg:gap-6 w-full max-w-full stagger-children">
            {jlptLevels.map((level, index) => (
              <div
                key={level.level}
                className="relative group w-full md:w-48 lg:w-56 flex shrink-0"
              >
                {/* Connector line */}
                {index < jlptLevels.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-5 lg:-right-6 w-4 lg:w-6 h-px bg-white/10" />
                )}
                <div className="w-full p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 shadow-xl flex flex-col items-center text-center">
                  <div
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${level.color} text-white shadow-[0_0_30px_rgba(255,255,255,0.2)] text-3xl font-jp font-bold mb-5 group-hover:scale-110 group-hover:rotate-6 transition-all`}
                  >
                    {level.kanji}
                  </div>
                  <h3 className="text-2xl font-bold mb-1 text-white">{level.level}</h3>
                  <p className="text-sm text-gray-300 font-medium mb-3">{level.label}</p>
                  <p className="text-xs text-gray-400 mt-auto">{level.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="py-24 relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-primary-900/40 border border-primary-500/20 text-primary-300 px-4 py-2 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
              <Languages className="w-4 h-4" />
              <span>Why JapanGoLearn?</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight">
              Everything you need to{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
                master Japanese
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              A modern platform that combines the best learning science with beautiful design and
              effortless gamification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] overflow-hidden"
              >
                {/* Inner ambient glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                <div
                  className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} text-white shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300 relative z-10`}
                >
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white relative z-10">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed relative z-10 font-medium">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-24 relative z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative p-12 sm:p-20 rounded-[3rem] bg-gradient-to-br from-primary-900/60 to-accent-900/40 border border-white/10 backdrop-blur-2xl text-center overflow-hidden shadow-2xl">
            {/* Background elements for CTA */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-500/30 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-500/30 rounded-full blur-[80px]" />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />

            <div className="relative z-10">
              <p className="text-6xl mb-6">⛩️</p>
              <h2 className="text-4xl sm:text-6xl font-black mb-6 tracking-tight text-white drop-shadow-md">
                Ready to start your
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-300 to-primary-300">
                  Japanese journey?
                </span>
              </h2>
              <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto font-medium">
                Join thousands of learners mastering Japanese with visual learning and gamification.
                It&apos;s totally free to get started.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 bg-white text-[#0b0f19] font-black px-12 py-5 rounded-2xl text-xl hover:scale-105 transition-all duration-300 shadow-[0_0_50px_rgba(255,255,255,0.2)]"
              >
                <Zap className="w-6 h-6 text-primary-600" />
                Get Started — It&apos;s Free
              </Link>
              <p className="mt-8 text-sm text-gray-400 font-jp font-medium uppercase tracking-widest">
                日本語の冒険を始めよう
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
