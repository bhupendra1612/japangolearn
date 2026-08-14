export const FEATURE_FLAGS = [
  "aiPractice",
  "premium",
  "unfinishedLevels",
  "teacherOnboarding",
  "teacherStudio",
  "courseCatalog",
  "bunnyUploads",
  "securePlayback",
  "freeEnrollment",
  "commerceWeb",
  "teacherEarnings",
  "teacherPayouts",
  "mobilePurchases",
  "teacherMobileMode",
] as const;
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];
export type FeatureFlags = Record<FeatureFlag, boolean>;

type FeatureEnvironment = Partial<
  Record<
    | "NEXT_PUBLIC_FEATURE_AI"
    | "NEXT_PUBLIC_FEATURE_PREMIUM"
    | "NEXT_PUBLIC_FEATURE_UNFINISHED_LEVELS"
    | "EXPO_PUBLIC_FEATURE_AI"
    | "EXPO_PUBLIC_FEATURE_PREMIUM"
    | "EXPO_PUBLIC_FEATURE_UNFINISHED_LEVELS"
    | "NEXT_PUBLIC_FEATURE_TEACHER_ONBOARDING"
    | "NEXT_PUBLIC_FEATURE_TEACHER_STUDIO"
    | "NEXT_PUBLIC_FEATURE_COURSE_CATALOG"
    | "NEXT_PUBLIC_FEATURE_BUNNY_UPLOADS"
    | "NEXT_PUBLIC_FEATURE_SECURE_PLAYBACK"
    | "NEXT_PUBLIC_FEATURE_FREE_ENROLLMENT"
    | "NEXT_PUBLIC_FEATURE_COMMERCE_WEB"
    | "NEXT_PUBLIC_FEATURE_TEACHER_EARNINGS"
    | "NEXT_PUBLIC_FEATURE_TEACHER_PAYOUTS"
    | "NEXT_PUBLIC_FEATURE_MOBILE_PURCHASES"
    | "NEXT_PUBLIC_FEATURE_TEACHER_MOBILE_MODE"
    | "EXPO_PUBLIC_FEATURE_TEACHER_ONBOARDING"
    | "EXPO_PUBLIC_FEATURE_TEACHER_STUDIO"
    | "EXPO_PUBLIC_FEATURE_COURSE_CATALOG"
    | "EXPO_PUBLIC_FEATURE_BUNNY_UPLOADS"
    | "EXPO_PUBLIC_FEATURE_SECURE_PLAYBACK"
    | "EXPO_PUBLIC_FEATURE_FREE_ENROLLMENT"
    | "EXPO_PUBLIC_FEATURE_COMMERCE_WEB"
    | "EXPO_PUBLIC_FEATURE_TEACHER_EARNINGS"
    | "EXPO_PUBLIC_FEATURE_TEACHER_PAYOUTS"
    | "EXPO_PUBLIC_FEATURE_MOBILE_PURCHASES"
    | "EXPO_PUBLIC_FEATURE_TEACHER_MOBILE_MODE",
    string | undefined
  >
>;

function enabled(value: string | undefined) {
  return value === "1" || value?.toLowerCase() === "true";
}

export function resolveFeatureFlags(environment: FeatureEnvironment): FeatureFlags {
  return {
    aiPractice: enabled(environment.NEXT_PUBLIC_FEATURE_AI ?? environment.EXPO_PUBLIC_FEATURE_AI),
    premium: enabled(
      environment.NEXT_PUBLIC_FEATURE_PREMIUM ?? environment.EXPO_PUBLIC_FEATURE_PREMIUM
    ),
    unfinishedLevels: enabled(
      environment.NEXT_PUBLIC_FEATURE_UNFINISHED_LEVELS ??
        environment.EXPO_PUBLIC_FEATURE_UNFINISHED_LEVELS
    ),
    teacherOnboarding: enabled(
      environment.NEXT_PUBLIC_FEATURE_TEACHER_ONBOARDING ??
        environment.EXPO_PUBLIC_FEATURE_TEACHER_ONBOARDING
    ),
    teacherStudio: enabled(
      environment.NEXT_PUBLIC_FEATURE_TEACHER_STUDIO ??
        environment.EXPO_PUBLIC_FEATURE_TEACHER_STUDIO
    ),
    courseCatalog: enabled(
      environment.NEXT_PUBLIC_FEATURE_COURSE_CATALOG ??
        environment.EXPO_PUBLIC_FEATURE_COURSE_CATALOG
    ),
    bunnyUploads: enabled(
      environment.NEXT_PUBLIC_FEATURE_BUNNY_UPLOADS ?? environment.EXPO_PUBLIC_FEATURE_BUNNY_UPLOADS
    ),
    securePlayback: enabled(
      environment.NEXT_PUBLIC_FEATURE_SECURE_PLAYBACK ??
        environment.EXPO_PUBLIC_FEATURE_SECURE_PLAYBACK
    ),
    freeEnrollment: enabled(
      environment.NEXT_PUBLIC_FEATURE_FREE_ENROLLMENT ??
        environment.EXPO_PUBLIC_FEATURE_FREE_ENROLLMENT
    ),
    commerceWeb: enabled(
      environment.NEXT_PUBLIC_FEATURE_COMMERCE_WEB ?? environment.EXPO_PUBLIC_FEATURE_COMMERCE_WEB
    ),
    teacherEarnings: enabled(
      environment.NEXT_PUBLIC_FEATURE_TEACHER_EARNINGS ??
        environment.EXPO_PUBLIC_FEATURE_TEACHER_EARNINGS
    ),
    teacherPayouts: enabled(
      environment.NEXT_PUBLIC_FEATURE_TEACHER_PAYOUTS ??
        environment.EXPO_PUBLIC_FEATURE_TEACHER_PAYOUTS
    ),
    mobilePurchases: enabled(
      environment.NEXT_PUBLIC_FEATURE_MOBILE_PURCHASES ??
        environment.EXPO_PUBLIC_FEATURE_MOBILE_PURCHASES
    ),
    teacherMobileMode: enabled(
      environment.NEXT_PUBLIC_FEATURE_TEACHER_MOBILE_MODE ??
        environment.EXPO_PUBLIC_FEATURE_TEACHER_MOBILE_MODE
    ),
  };
}

export const SERVER_KILL_SWITCHES = [
  "teacherCommands",
  "mediaCommands",
  "enrollmentCommands",
  "commerceCommands",
  "payoutCommands",
] as const;

export type ServerKillSwitch = (typeof SERVER_KILL_SWITCHES)[number];
export type ServerKillSwitches = Record<ServerKillSwitch, boolean>;

type ServerKillSwitchEnvironment = Partial<
  Record<
    | "SERVER_KILL_SWITCH_TEACHER_COMMANDS"
    | "SERVER_KILL_SWITCH_MEDIA_COMMANDS"
    | "SERVER_KILL_SWITCH_ENROLLMENT_COMMANDS"
    | "SERVER_KILL_SWITCH_COMMERCE_COMMANDS"
    | "SERVER_KILL_SWITCH_PAYOUT_COMMANDS",
    string | undefined
  >
>;

function killed(value: string | undefined) {
  return value === undefined ? true : enabled(value);
}

export function resolveServerKillSwitches(
  environment: ServerKillSwitchEnvironment
): ServerKillSwitches {
  return {
    teacherCommands: killed(environment.SERVER_KILL_SWITCH_TEACHER_COMMANDS),
    mediaCommands: killed(environment.SERVER_KILL_SWITCH_MEDIA_COMMANDS),
    enrollmentCommands: killed(environment.SERVER_KILL_SWITCH_ENROLLMENT_COMMANDS),
    commerceCommands: killed(environment.SERVER_KILL_SWITCH_COMMERCE_COMMANDS),
    payoutCommands: killed(environment.SERVER_KILL_SWITCH_PAYOUT_COMMANDS),
  };
}
