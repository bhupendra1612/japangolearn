import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for JapanGoLearn platform by JapanGoLearn.",
  alternates: {
    canonical: "https://japangolearn.com/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8">
          Privacy <span className="gradient-text">Policy</span>
        </h1>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <p className="text-gray-600 dark:text-gray-400">Last updated: February 2026</p>

          <h2 className="text-xl font-semibold mt-8">1. Information We Collect</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            We collect information you provide directly, such as your name, email address, and
            learning preferences when you create an account. We also collect usage data including
            lesson progress, XP earned, and interaction patterns to personalize your experience.
          </p>

          <h2 className="text-xl font-semibold mt-8">2. How We Use Your Information</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            We use your information to provide and improve the Platform, personalize your learning
            experience, send important notifications about your account, and analyze usage patterns
            to make JapanGoLearn better.
          </p>

          <h2 className="text-xl font-semibold mt-8">3. Data Storage</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Your data is securely stored using Supabase infrastructure. We implement
            industry-standard security measures, including encryption in transit and at rest, to
            protect your personal information.
          </p>

          <h2 className="text-xl font-semibold mt-8">4. Third-Party Services</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            We use third-party services including Supabase (database), Google Gemini (AI features),
            and analytics tools. These services have their own privacy policies governing their use
            of data.
          </p>

          <h2 className="text-xl font-semibold mt-8">5. Your Rights</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            You have the right to access, update, or delete your personal information at any time
            through your account settings. You may also request a copy of all data we hold about
            you.
          </p>

          <h2 className="text-xl font-semibold mt-8">6. Cookies</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            We use essential cookies for authentication and session management. We do not use
            tracking cookies for advertising purposes.
          </p>

          <h2 className="text-xl font-semibold mt-8">7. Contact</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            For privacy-related inquiries, contact us at{" "}
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
