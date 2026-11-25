import { SUPPORT_EMAIL } from "@/constants/links";

export const PRIVACY_POLICY = {
  company: "Digital Rise 24",
  country: "India",
  email: SUPPORT_EMAIL,
  updated: "3 October 2026",
  version: "2026-10-03",
  minimumAge: 13,
} as const;

export type PrivacyDiagnostics = { crashReports: boolean; usageAnalytics: boolean };

// Match the switches used by monitoring.ts and analytics.ts. These are build
// settings, not user preferences; reading the policy never starts telemetry.
export const privacyDiagnostics: PrivacyDiagnostics = {
  crashReports: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  usageAnalytics: Boolean(process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT),
};

export type PrivacySection = {
  id: string;
  title: string;
  summary: string;
  paragraphs: string[];
  bullets?: string[];
};

export function getPrivacySections(diagnostics: PrivacyDiagnostics): PrivacySection[] {
  return [
    {
      id: "about",
      title: "Who we are",
      summary: "Digital Rise 24 · India",
      paragraphs: [
        "JapanGoLearn is operated by Digital Rise 24, based in India. This policy explains how we handle information in the JapanGoLearn mobile app, including account services shared with our website.",
        "The app is free to use. We do not show advertising, charge for subscriptions or in-app purchases, or sell or rent your personal data. We do not share it with advertisers or data brokers.",
        `For privacy questions or requests, contact ${SUPPORT_EMAIL}. This policy covers the mobile app; separate website features may have additional disclosures.`,
      ],
    },
    {
      id: "data",
      title: "Information we collect",
      summary: "Your account and learning progress",
      paragraphs: [
        "We collect information needed to provide your account, keep your progress and respond to your requests.",
      ],
      bullets: [
        "Account information: your email address, display name, selected study level and account creation details. Our authentication provider processes your password and sign-in information.",
        "An optional profile photo, if you choose to upload one.",
        "Study information: saved practice lists, answers, quiz and exam results, review history, XP, goals, streaks, achievements and activity dates. Practice results can include response times and whether you used hints.",
        "Support messages and any information you choose to include when contacting us.",
        "Technical information necessary to serve the app, secure accounts and deliver updates, such as IP addresses, request logs, app version and platform. Optional diagnostic reporting is explained below.",
      ],
    },
    {
      id: "use",
      title: "How we use information",
      summary: "To support your learning and run the app",
      paragraphs: [
        "We use your information to create and secure your account, sync your study progress, organise practice, calculate learning results, respond to support requests and maintain the app.",
      ],
      bullets: [
        "We send essential account messages, such as verification codes and password-reset emails.",
        "We use learning records to show your progress and help you review material. We do not use them to create advertising profiles.",
        "The current mobile app does not include an AI chat or voice-recording feature, and does not send your practice answers or recordings to an AI service for processing.",
      ],
    },
    {
      id: "permissions",
      title: "Photos, audio & permissions",
      summary: "A profile photo is always optional",
      paragraphs: [
        "When you choose a profile photo, we ask for photo-library access so you can select an image. The app uploads the image you select; it does not scan your library. You can decline this permission and continue studying.",
        "Profile photos are stored in a publicly readable location. Anyone with the direct image link can view the photo. Choose an image you are comfortable sharing; contact us if you need an uploaded image removed.",
        "The current Android app plays pronunciation and listening audio without requesting camera or microphone access. Speech playback may use your device’s installed speech service, whose network behaviour depends on your device and voice settings.",
        "We do not request access to your precise location, contacts, messages, call logs or calendar. You can manage permissions in your device settings.",
      ],
    },
    {
      id: "storage",
      title: "Storage & service providers",
      summary: "Company-managed Supabase account",
      paragraphs: [
        "Account information, learning records and uploaded photos are stored in Digital Rise 24’s Supabase account. The current primary project is hosted in the Mumbai, India region. Supabase provides authentication, database and file-storage services.",
        "Expo helps deliver app updates and processes technical request information, such as platform and app version. Email-delivery providers process the address and message content needed to deliver account emails. If you email support, the email services involved also process that correspondence.",
        "Service providers may process technical data in countries other than your own. We use them to provide the app’s services, not to sell your data. Information may also be disclosed when required by applicable law or to respond to lawful requests and protect the service.",
        "We use encrypted connections and account access controls. No system can guarantee absolute security. Never share your password or verification codes with others.",
      ],
    },
    {
      id: "diagnostics",
      title: "Crash reports & analytics",
      summary: "Reporting status for this version",
      paragraphs: [
        diagnostics.crashReports
          ? "Sentry crash and error reporting is enabled in this version. Reports can contain error messages, stack traces, app and device information, performance and session data, and context attached to an error. Some context may include account identifiers or technical request details. We use these reports to investigate failures."
          : "Sentry crash and error reporting is not configured in this version. The app does not send reports to Sentry when reporting is not configured.",
        diagnostics.usageAnalytics
          ? "Usage analytics is enabled in this version. App events, their associated properties, app environment and timestamps are sent to our configured analytics service to understand app behaviour and investigate problems. This is separate from the study history saved in your account."
          : "Separate usage analytics is not configured in this version. Your account’s study history, XP and results are still saved to provide learning features; these are not advertising analytics.",
        "Google Play may independently provide Android vitals crash and app-freeze reports from devices whose users have chosen to share usage and diagnostics with Google. These reports follow Google’s settings and policies.",
        "If our diagnostic services or data practices change, we will update the relevant notices and store disclosures and request consent where required.",
      ],
    },
    {
      id: "device",
      title: "Information on your device",
      summary: "Offline study and sign-in storage",
      paragraphs: [
        "The app stores downloaded study material, preferences and some learning records locally so you can study offline. Unsynced activity can be queued on your device and sent to your account when connectivity returns.",
        "The native app stores sign-in tokens using the device’s secure storage. Other caches and downloads use app storage. The browser version uses browser storage and may behave differently.",
        "Signing out does not necessarily remove every downloaded file or local cache. Use offline-pack controls to remove downloads, or your device’s app-storage controls to clear local app data. Clearing app data can discard activity that has not yet synced.",
      ],
    },
    {
      id: "retention",
      title: "Retention & account deletion",
      summary: "Keep what is needed, remove what is not",
      paragraphs: [
        "We retain account and study information while your account is active to provide the service. We do not keep personal data indefinitely simply because it may be useful later. When information is no longer needed for the service or a legitimate legal or security purpose, our policy is to delete it or remove identifying details.",
        `You can start account deletion from Profile → Delete account, or request deletion by emailing ${SUPPORT_EMAIL} from your registered address. We may need to verify that you own the account. Uninstalling the app does not delete your online account.`,
        "The automatic deletion flow removes your account and linked records where possible. Some linked records or uploaded files can require additional cleanup. If linked records prevent complete deletion, account access may be disabled while remaining data needs review. Contact us to request a review or confirmation of complete removal; disabling access alone is not a promise that all records have been erased.",
        "We aim to resolve verified privacy and deletion requests within 30 days. If a request needs more time, we will explain the reason. Applicable legal deadlines take precedence. Any information retained for a legal or security reason should be limited to what is necessary for that reason.",
        "Backup copies, where enabled, may remain until overwritten or expired under the storage provider’s configured retention schedule. Account deletion does not erase every backup immediately. Contact us for the retention details applicable to your request.",
      ],
    },
    {
      id: "choices",
      title: "Your choices & requests",
      summary: "Access, correction and deletion",
      paragraphs: [
        "You can edit your display name, learning level, daily goal and profile photo in Profile. You can decline optional photo access, manage device permissions, and remove study items or downloads using the available controls.",
        `You can email ${SUPPORT_EMAIL} to request a copy of your personal information, correct information, request deletion, raise a privacy concern, or ask about the processing of your data. Where applicable, you may also withdraw consent or exercise other rights provided by local law.`,
        "Please describe your request and include your registered email address. Do not send your password, verification codes or unnecessary identity documents. We may request proportionate verification before disclosing or changing account information.",
      ],
    },
    {
      id: "age",
      title: "Younger learners",
      summary: "Intended for ages 13 and above",
      paragraphs: [
        "JapanGoLearn is intended for learners aged 13 and above and is not intended for children under 13. Learners aged 13–17 should involve a parent or guardian when creating an account and using the app.",
        "Local age and parental-consent requirements still apply, including any higher minimum age. The current app does not verify age or collect verified parental consent.",
        `If you are a parent or guardian and believe your child has provided information inappropriately, contact ${SUPPORT_EMAIL} so we can review the situation and arrange removal where appropriate.`,
      ],
    },
    {
      id: "updates",
      title: "Policy updates & contact",
      summary: "A clear date and a direct contact",
      paragraphs: [
        "We will update the date and version of this policy when it changes. Material changes to data collection or use will be reflected in relevant app notices and store disclosures, with consent obtained where required.",
        `Privacy contact: Digital Rise 24, India. Email: ${SUPPORT_EMAIL}.`,
        "This policy describes the mobile app. External websites and services you choose to open have their own privacy policies.",
      ],
    },
  ];
}
