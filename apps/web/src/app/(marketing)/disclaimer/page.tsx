import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: "Disclaimer for JapanGoLearn educational platform.",
  alternates: {
    canonical: "https://japangolearn.com/disclaimer",
  },
};

export default function DisclaimerPage() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8">
          <span className="gradient-text">Disclaimer</span>
        </h1>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <p className="text-gray-600 dark:text-gray-400">Last updated: February 2026</p>

          <h2 className="text-xl font-semibold mt-8">Educational Purpose</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            JapanGoLearn is designed as a supplementary Japanese language learning tool. While we
            strive for accuracy in all content, we do not guarantee that our materials are free from
            errors. Users are encouraged to verify important information with official sources.
          </p>

          <h2 className="text-xl font-semibold mt-8">JLPT Preparation</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Our JLPT preparation paths are designed based on publicly available exam guidelines.
            JapanGoLearn is not affiliated with or endorsed by the Japan Foundation or JEES (Japan
            Educational Exchanges and Services). Passing the JLPT exam depends on individual effort
            and preparation.
          </p>

          <h2 className="text-xl font-semibold mt-8">AI-Generated Content</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Our AI conversation practice feature uses Google Gemini. AI-generated responses may
            occasionally contain inaccuracies. We recommend using AI practice as a supplement to,
            not a replacement for, structured learning and human interaction.
          </p>

          <h2 className="text-xl font-semibold mt-8">No Professional Advice</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            The content provided on JapanGoLearn does not constitute professional language
            instruction or certification. For official certifications, please consult accredited
            institutions.
          </p>

          <h2 className="text-xl font-semibold mt-8">Contact</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            If you find any errors or have concerns about our content, please contact us at{" "}
            <a
              href="mailto:support@japangolearn.com"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              support@japangolearn.com
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
