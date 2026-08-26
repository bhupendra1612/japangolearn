import Link from "next/link";
import { ArrowRight, BadgeCheck, IndianRupee, Video } from "lucide-react";

const points = [
  {
    icon: BadgeCheck,
    title: "Apply with the account you already have",
    description: "Your student account becomes a teacher account once an admin approves you.",
  },
  {
    icon: Video,
    title: "Publish video and article lessons",
    description: "Upload straight to our video pipeline and organise lessons into sections.",
  },
  {
    icon: IndianRupee,
    title: "Set free or paid pricing in INR",
    description: "Offer a free course to build an audience, or charge for the full curriculum.",
  },
];

export function TeachWithUs() {
  return (
    <section className="relative z-10 py-20" aria-labelledby="teach-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-primary-900/50 to-accent-900/30 p-8 sm:p-12 lg:p-16">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-accent-200">
                For Japanese teachers
              </span>
              <h2
                id="teach-heading"
                className="mt-6 text-3xl sm:text-5xl font-black tracking-tight text-white"
              >
                Teach Japanese on JapanGoLearn
              </h2>
              <p className="mt-5 text-lg leading-8 text-gray-300">
                Reach learners across India who are studying for the JLPT, for work in Japan, or for
                study abroad. You bring the teaching; we handle hosting, payments, and access.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/dashboard/teacher"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-lg font-bold text-[#0b0f19] transition hover:scale-105"
                >
                  Apply to teach
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-8 py-4 font-semibold text-white transition hover:bg-white/10"
                >
                  Ask a question
                </Link>
              </div>
            </div>

            <ul className="space-y-5">
              {points.map((point) => (
                <li
                  key={point.title}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-accent-200">
                    <point.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-white">{point.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-400">{point.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
