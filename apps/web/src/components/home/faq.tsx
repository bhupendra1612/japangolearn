import {
  JLPT_LEVELS,
  OFFERED_LEVELS,
  availableLevels,
  hasContent,
  type CurriculumStats,
} from "@/lib/curriculum";
import { courseCatalogEnabled, teacherStudioEnabled } from "@/lib/marketplace";

function listToSentence(values: string[]) {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

/**
 * The level answer is generated from real content so it cannot drift out of date
 * the way a hard-coded "N5 only" sentence would once N4 is seeded.
 */
function buildFaq(stats: CurriculumStats) {
  const ready = availableLevels(stats);
  const planned = OFFERED_LEVELS.filter((level) => !hasContent(stats.byLevel[level]));
  const later = JLPT_LEVELS.map(({ level }) => level).filter(
    (level) => !ready.includes(level) && !planned.includes(level)
  );

  const levelAnswer = ready.length
    ? `${listToSentence(ready)} ${ready.length === 1 ? "is" : "are"} available now.` +
      (planned.length ? ` ${listToSentence(planned)} is being written next.` : "") +
      (later.length ? ` ${listToSentence(later)} will follow after that.` : "")
    : "We are preparing the first JLPT level right now. Sign up and we will let you know the moment it is ready.";

  return [
    {
      question: "Is JapanGoLearn free?",
      answer: courseCatalogEnabled
        ? "Yes. The hiragana and katakana charts, the vocabulary browser, and the JLPT word lists are free and need no account. Creating a free account adds progress tracking, streaks, and quizzes. Some teacher-led courses are paid."
        : "Yes, completely. The hiragana and katakana charts, the vocabulary browser, and the JLPT word lists need no account at all. Creating a free account adds progress tracking, streaks, and quizzes — there is nothing to pay for.",
    },
    {
      question: "Which JLPT levels can I study?",
      answer: levelAnswer,
    },
    {
      question: "Do I need to know any Japanese to start?",
      answer:
        "No. Start with the hiragana chart and JLPT N5 vocabulary. Every word shows kanji, hiragana, and romaji, so you can read along before you learn the scripts.",
    },
    {
      question: "Is there support for Hindi speakers?",
      answer:
        "Yes. Every vocabulary word includes a Hindi pronunciation guide alongside English meaning and romaji, so you can sound out Japanese words using a script you already read.",
    },
    {
      question: "Can I study on my phone?",
      answer:
        "Yes. The website works on mobile browsers, and there is a JapanGoLearn mobile app. Your progress is tied to your account, so it stays in sync wherever you sign in.",
    },
    ...(courseCatalogEnabled
      ? [
          {
            question: "How do paid courses work?",
            answer:
              "Approved teachers publish courses with video and article lessons, priced in Indian rupees. Once you enrol, the course stays linked to your account and you can return to it any time.",
          },
        ]
      : []),
    ...(teacherStudioEnabled
      ? [
          {
            question: "Can I teach on JapanGoLearn?",
            answer:
              "Yes. Apply from your account and an admin reviews your profile. Once approved you can create free or paid courses, upload video lessons, and publish them to the catalogue.",
          },
        ]
      : []),
  ];
}

export function Faq({ stats }: { stats: CurriculumStats }) {
  const faq = buildFaq(stats);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };

  return (
    <section className="relative z-10 py-20" aria-labelledby="faq-heading">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 id="faq-heading" className="text-3xl sm:text-4xl font-bold tracking-tight">
            Frequently asked questions
          </h2>
        </div>

        <div className="space-y-4">
          {faq.map((entry) => (
            <details
              key={entry.question}
              className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-white/20"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-white marker:hidden">
                {entry.question}
                <span
                  aria-hidden="true"
                  className="shrink-0 text-2xl font-light text-primary-300 transition-transform duration-300 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-4 leading-relaxed text-gray-400">{entry.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
