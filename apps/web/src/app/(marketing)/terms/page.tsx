import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for using JapanGoLearn platform.",
  alternates: {
    canonical: "https://japangolearn.com/terms",
  },
};

export default function TermsPage() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8">
          Terms & <span className="gradient-text">Conditions</span>
        </h1>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <p className="text-gray-600 dark:text-gray-400">Last updated: February 2026</p>

          <h2 className="text-xl font-semibold mt-8">1. Acceptance of Terms</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            By accessing or using JapanGoLearn (&quot;the Platform&quot;), operated by JapanGoLearn,
            you agree to be bound by these Terms & Conditions. If you do not agree, please do not
            use the Platform.
          </p>

          <h2 className="text-xl font-semibold mt-8">2. Description of Service</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            JapanGoLearn provides a Japanese language learning platform featuring visual learning
            tools, gamified exercises, AI-powered conversation practice, and structured JLPT
            preparation paths.
          </p>

          <h2 className="text-xl font-semibold mt-8">3. User Accounts</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            You are responsible for maintaining the confidentiality of your account credentials. You
            must provide accurate information when creating an account. You must be at least 13
            years old to use this service.
          </p>

          <h2 className="text-xl font-semibold mt-8">4. Acceptable Use</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            You agree not to misuse the Platform, including but not limited to: attempting to hack
            or disrupt the service, scraping content, sharing offensive material, or violating any
            applicable local, national, or international law.
          </p>

          <h2 className="text-xl font-semibold mt-8">5. Intellectual Property</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            All content on JapanGoLearn, including but not limited to text, graphics, logos,
            animations, and software, is the property of JapanGoLearn and is protected by
            intellectual property laws.
          </p>

          <h2 className="text-xl font-semibold mt-8">6. Limitation of Liability</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            JapanGoLearn is provided &quot;as is&quot; without warranties of any kind. JapanGoLearn
            shall not be liable for any indirect, incidental, or consequential damages arising from
            your use of the Platform.
          </p>

          <h2 className="text-xl font-semibold mt-8">7. Changes to Terms</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            We reserve the right to modify these terms at any time. Continued use of the Platform
            after changes constitutes acceptance of the updated terms.
          </p>

          <h2 className="text-xl font-semibold mt-8">8. Contact</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            For questions about these Terms, contact us at{" "}
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
