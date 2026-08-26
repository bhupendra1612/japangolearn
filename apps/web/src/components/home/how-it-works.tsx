const steps = [
  {
    number: "1",
    title: "Pick your level",
    description:
      "Start at JLPT N5 if you are new. Everything is grouped by level and topic, so you always know what to study next.",
  },
  {
    number: "2",
    title: "Learn and practise daily",
    description:
      "Work through vocabulary, kanji stroke order, and grammar. Quizzes and flashcards keep each session short.",
  },
  {
    number: "3",
    title: "Track progress and streaks",
    description:
      "Earn XP, hold your streak, and watch your level fill up. Your progress syncs across web and mobile.",
  },
];

export function HowItWorks() {
  return (
    <section className="relative z-10 py-20" aria-labelledby="how-it-works-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <h2 id="how-it-works-heading" className="text-3xl sm:text-4xl font-bold tracking-tight">
            How it works
          </h2>
          <p className="mt-4 text-gray-400 text-lg max-w-2xl mx-auto">
            Three steps from your first hiragana character to a JLPT-ready routine.
          </p>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <li
              key={step.number}
              className="relative rounded-3xl border border-white/10 bg-white/5 p-8"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-600 text-xl font-black text-white shadow-lg"
              >
                {step.number}
              </span>
              <h3 className="mt-5 text-xl font-bold text-white">{step.title}</h3>
              <p className="mt-3 leading-relaxed text-gray-400">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
