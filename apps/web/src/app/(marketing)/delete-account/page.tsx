import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  DeleteAccountPanel,
  DeleteAccountSignedOut,
} from "@/components/account/delete-account-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Delete Your Account",
  description: "Instructions and a form to permanently delete your JapanGoLearn account and data.",
  alternates: {
    canonical: "https://japangolearn.com/delete-account",
  },
};

export default async function DeleteAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8">
          Delete Your <span className="gradient-text">Account</span>
        </h1>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 mb-10">
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            You can permanently delete your JapanGoLearn account and personal data at any time, from
            this page or from the Delete Account option in the mobile app under Profile.
          </p>

          <h2 className="text-xl font-semibold mt-8">What gets deleted</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Your profile, display name, avatar, email, login credentials, learning progress (XP,
            streaks, kana/kanji/vocabulary mastery), practice lists, achievements, and activity
            history are permanently deleted immediately.
          </p>

          <h2 className="text-xl font-semibold mt-8">What may be retained</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            If you have purchased a course or published content (for example as a teacher), we
            retain the underlying transaction and content records as required for financial and
            legal record-keeping. In that case, your personal data is anonymized and your account
            access is permanently revoked instead of the record being deleted outright.
          </p>

          <h2 className="text-xl font-semibold mt-8">Need help?</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            If you have trouble deleting your account, email{" "}
            <a
              href="mailto:support@japangolearn.com"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              support@japangolearn.com
            </a>{" "}
            from the address on your account and we&apos;ll delete it for you.
          </p>
        </div>

        {user ? <DeleteAccountPanel email={user.email ?? ""} /> : <DeleteAccountSignedOut />}
      </div>
    </section>
  );
}
