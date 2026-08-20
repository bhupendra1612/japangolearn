import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How JapanGoLearn collects, uses, and protects your information on the JapanGoLearn website and Android app.",
  alternates: {
    canonical: "https://japangolearn.com/privacy",
  },
};

const heading = "text-xl font-semibold mt-10";
const body = "text-gray-600 dark:text-gray-400 leading-relaxed";
const list = "text-gray-600 dark:text-gray-400 leading-relaxed list-disc pl-6 space-y-2";
const linkClass = "text-primary-600 dark:text-primary-400 hover:underline";

export default function PrivacyPage() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold mb-8">
          Privacy <span className="gradient-text">Policy</span>
        </h1>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
          <p className="text-gray-600 dark:text-gray-400">Last updated: 19 August 2026</p>

          <p className={body}>
            This policy explains what JapanGoLearn collects, why, and what you can do about it. It
            covers both the website at japangolearn.com and the{" "}
            <strong>JapanGoLearn Android app</strong> (package <code>com.japangolearn.app</code>),
            which share a single account and database. Where the app and the website differ, that is
            called out below.
          </p>

          <h2 className={heading}>1. Information you give us</h2>
          <ul className={list}>
            <li>
              <strong>Email address</strong> — required to create an account and to verify it with a
              six-digit code.
            </li>
            <li>
              <strong>Display name</strong> — shown in your profile.
            </li>
            <li>
              <strong>JLPT level</strong> — the study level you select at signup and can change
              later.
            </li>
            <li>
              <strong>Profile photo</strong> — optional. See section 3.
            </li>
          </ul>

          <h2 className={heading}>2. Information created as you study</h2>
          <p className={body}>
            Using the app or the website creates a record of your learning so your progress persists
            across devices:
          </p>
          <ul className={list}>
            <li>XP earned, daily goals, and streak counts</li>
            <li>Quiz and flashcard results, including which answers were correct</li>
            <li>Achievements unlocked and an activity log of completed study sessions</li>
            <li>Vocabulary and kanji you save into your own practice lists</li>
            <li>The date and time you were last active</li>
          </ul>

          <h2 className={heading}>3. Photos and device permissions (Android app)</h2>
          <p className={body}>
            If you choose to set a profile photo, the app asks for permission to open your photo
            library and you pick a single image. The app does not use your camera, does not scan or
            index your library, and reads nothing beyond the one image you select. You can decline
            the permission and continue using every other part of the app.
          </p>
          <p className={body}>
            Please note that profile photos are stored in a publicly readable location, which means
            anyone who has the direct image link can view it. Do not upload a photo you would not be
            comfortable sharing. You can replace or remove your photo at any time from your profile.
          </p>
          <p className={body}>
            The Android app requests only these permissions: internet access, network state, reading
            the image you select, vibration for in-app feedback, and audio settings for
            pronunciation playback. Permissions for camera, microphone, video, and external storage
            writing are explicitly blocked in the app build.
          </p>

          <h2 className={heading}>4. How we use your information</h2>
          <p className={body}>
            We use it to run your account, save and sync your progress, show your streaks and
            achievements, send account emails such as signup verification and password resets, and
            fix problems you report. We do not use your information to build advertising profiles.
          </p>

          <h2 className={heading}>5. What we do not do</h2>
          <ul className={list}>
            <li>We do not sell or rent your personal information to anyone.</li>
            <li>We do not share it with advertisers or data brokers.</li>
            <li>We do not show third-party advertising in the app or on the website.</li>
            <li>We do not track you across other apps or websites.</li>
            <li>
              We do not collect your location, contacts, calendar, call logs, messages, or the list
              of apps installed on your device.
            </li>
            <li>
              The current version of the Android app sends <strong>no</strong> usage analytics and{" "}
              <strong>no</strong> automatic crash reports to any third party. If we enable crash
              reporting in a future version, we will update this policy and the app&apos;s Play
              Store data-safety listing before doing so.
            </li>
          </ul>

          <h2 className={heading}>6. Where your data is stored</h2>
          <p className={body}>
            Your account and study data are stored with Supabase, our database and authentication
            provider, on servers in the Asia Pacific (Mumbai, India) region. Data is encrypted in
            transit and at rest. Access to the production database is restricted to the account
            owner, and per-user access rules prevent one account from reading another&apos;s data.
          </p>

          <h2 className={heading}>7. Third-party services</h2>
          <ul className={list}>
            <li>
              <strong>Supabase</strong> — database, file storage, and authentication. Holds the data
              described in sections 1 and 2.
            </li>
            <li>
              <strong>Cloudflare</strong> — hosts and serves the website. Processes standard server
              request data such as IP address in order to deliver pages and block abuse.
            </li>
            <li>
              <strong>Expo</strong> — delivers over-the-air updates to the Android app. When the app
              checks for an update it sends basic technical details such as app version and
              platform.
            </li>
            <li>
              <strong>Google Gemini</strong> — powers the optional AI conversation practice on the
              website. It receives only the messages you type into that feature, and only while you
              use it. This feature is not part of the current Android app.
            </li>
          </ul>
          <p className={body}>Each of these providers handles data under its own privacy policy.</p>

          <h2 className={heading}>8. Your rights and choices</h2>
          <p className={body}>
            You can view and edit your display name, JLPT level, and profile photo from your profile
            at any time, on either the app or the website. You can request a copy of the data we
            hold about you by emailing us.
          </p>

          <h2 className={heading}>9. Deleting your account</h2>
          <p className={body}>
            You can delete your account and its associated data at any time. There are two ways:
          </p>
          <ul className={list}>
            <li>
              <strong>In the Android app</strong> — open Profile, scroll to Delete Account, and
              confirm.
            </li>
            <li>
              <strong>On the web</strong> — visit{" "}
              <Link href="/delete-account" className={linkClass}>
                japangolearn.com/delete-account
              </Link>
              , which you can use whether or not you have the app installed.
            </li>
          </ul>
          <p className={body}>
            Deletion removes your account, profile, study history, saved lists, achievements, and
            uploaded profile photo. It takes effect immediately and cannot be undone. In the rare
            case where a record must be retained for legal or accounting reasons, we anonymise your
            profile and permanently disable sign-in instead, so the remaining record cannot be
            linked back to you. Routine encrypted backups may hold a copy for up to 30 days before
            they expire.
          </p>

          <h2 className={heading}>10. Children</h2>
          <p className={body}>
            JapanGoLearn is not directed at children. You must be at least 13 years old to create an
            account, and older if the law where you live sets a higher age for consenting to the
            processing of personal data. We do not knowingly collect information from children under
            13. If you believe a child has created an account, contact us and we will delete it.
          </p>

          <h2 className={heading}>11. Cookies</h2>
          <p className={body}>
            The website uses essential cookies for signing in and keeping you signed in. We do not
            use advertising or cross-site tracking cookies. The Android app does not use cookies; it
            stores your session in the device&apos;s encrypted secure storage.
          </p>

          <h2 className={heading}>12. Changes to this policy</h2>
          <p className={body}>
            If we change what we collect or how we use it, we will update this page and change the
            date at the top. Significant changes affecting the Android app will also be reflected in
            its Play Store data-safety listing.
          </p>

          <h2 className={heading}>13. Contact</h2>
          <p className={body}>
            For any privacy question, or to request a copy or deletion of your data, contact us at{" "}
            <a href="mailto:support@japangolearn.com" className={linkClass}>
              support@japangolearn.com
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
