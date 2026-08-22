import Link from "next/link";
import { ArrowRight, BookOpen, Brain, PenLine, Search } from "lucide-react";

/**
 * Shown to learners who have not completed anything yet.
 *
 * A brand-new account otherwise lands on a wall of zeros — 0 XP, 0 streak, 0
 * achievements, an empty heatmap — which reads as a broken product rather than
 * an empty one. This replaces that first impression with a route in.
 */
export function FirstRunGuide({ displayName }: { displayName: string }) {
  const steps = [
    {
      icon: BookOpen,
      title: "Take your first quiz",
      body: "Ten quick questions. Every word you answer starts building a mastery score.",
      href: "/dashboard/vocabulary",
      cta: "Start vocabulary",
    },
    {
      icon: Brain,
      title: "Come back for reviews",
      body: "Items you have met return right before you would forget them, on their own schedule.",
      href: "/dashboard/review",
      cta: "See reviews",
    },
    {
      icon: PenLine,
      title: "Practise writing",
      body: "Trace kana and kanji stroke by stroke, with animated stroke order.",
      href: "/dashboard/writing",
      cta: "Open writing",
    },
    {
      icon: Search,
      title: "Look anything up",
      body: "Search vocabulary, kanji, kana, and grammar at once, and save what matters.",
      href: "/dashboard/search",
      cta: "Try search",
    },
  ];

  return (
    <section className="rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-5 sm:p-6 dark:border-primary-800 dark:from-primary-900/30 dark:to-gray-800/60">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
          Getting started
        </p>
        <h2 className="mt-1 text-xl font-bold">Welcome, {displayName.split(" ")[0]} 👋</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Nothing here is filled in yet — that is normal. Four things worth doing first:
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {steps.map((step, index) => (
          <Link
            key={step.href}
            href={step.href}
            className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/60"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="gradient-bg-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white">
                <step.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-xs font-bold text-gray-400">Step {index + 1}</span>
            </div>
            <h3 className="font-semibold">{step.title}</h3>
            <p className="mt-1 flex-1 text-sm text-gray-500 dark:text-gray-400">{step.body}</p>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 dark:text-primary-400">
              {step.cta}
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
