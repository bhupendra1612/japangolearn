import Link from "next/link";
import { ArrowRight, Languages, ListChecks, PenLine, Type } from "lucide-react";

/**
 * In-content links to the free reference pages. These are the strongest organic
 * landing pages on the site, and the home page previously linked to none of them
 * outside the navbar.
 */
const tools = [
  {
    href: "/hiragana",
    icon: PenLine,
    title: "Hiragana chart",
    description: "All 46 base characters with stroke order and romaji.",
    accent: "from-emerald-400 to-teal-600",
  },
  {
    href: "/katakana",
    icon: Type,
    title: "Katakana chart",
    description: "Read loanwords, names, and menus with confidence.",
    accent: "from-blue-400 to-indigo-600",
  },
  {
    href: "/vocabulary",
    icon: Languages,
    title: "Vocabulary browser",
    description: "Every word with kanji, hiragana, romaji, and Hindi pronunciation.",
    accent: "from-violet-400 to-purple-600",
  },
  {
    href: "/vocabulary/level/n5",
    icon: ListChecks,
    title: "JLPT N5 word list",
    description: "The complete beginner word set, grouped by topic.",
    accent: "from-amber-400 to-orange-600",
  },
];

export function FreeTools() {
  return (
    <section className="relative z-10 py-20" aria-labelledby="free-tools-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 id="free-tools-heading" className="text-3xl sm:text-4xl font-bold tracking-tight">
            Start free — no account needed
          </h2>
          <p className="mt-4 text-gray-400 text-lg max-w-2xl mx-auto">
            Open reference pages you can use right now. Create an account only when you want to
            track progress.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex flex-col rounded-3xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/10"
            >
              <span
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tool.accent} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}
              >
                <tool.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-bold text-white">{tool.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-400">{tool.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-300">
                Open
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
