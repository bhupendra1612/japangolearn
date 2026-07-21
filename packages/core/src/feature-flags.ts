export const FEATURE_FLAGS = ["aiPractice", "premium", "unfinishedLevels"] as const;
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];
export type FeatureFlags = Record<FeatureFlag, boolean>;

type FeatureEnvironment = Partial<
  Record<
    | "NEXT_PUBLIC_FEATURE_AI"
    | "NEXT_PUBLIC_FEATURE_PREMIUM"
    | "NEXT_PUBLIC_FEATURE_UNFINISHED_LEVELS"
    | "EXPO_PUBLIC_FEATURE_AI"
    | "EXPO_PUBLIC_FEATURE_PREMIUM"
    | "EXPO_PUBLIC_FEATURE_UNFINISHED_LEVELS",
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
  };
}
