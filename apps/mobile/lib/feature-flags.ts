import { resolveFeatureFlags } from "@japangolearn/core";

export const featureFlags = resolveFeatureFlags({
  EXPO_PUBLIC_FEATURE_AI: process.env.EXPO_PUBLIC_FEATURE_AI,
  EXPO_PUBLIC_FEATURE_PREMIUM: process.env.EXPO_PUBLIC_FEATURE_PREMIUM,
  EXPO_PUBLIC_FEATURE_UNFINISHED_LEVELS: process.env.EXPO_PUBLIC_FEATURE_UNFINISHED_LEVELS,
});
