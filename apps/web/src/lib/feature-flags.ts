import { resolveFeatureFlags } from "@japangolearn/core";

export const featureFlags = resolveFeatureFlags({
  NEXT_PUBLIC_FEATURE_AI: process.env.NEXT_PUBLIC_FEATURE_AI,
  NEXT_PUBLIC_FEATURE_PREMIUM: process.env.NEXT_PUBLIC_FEATURE_PREMIUM,
  NEXT_PUBLIC_FEATURE_UNFINISHED_LEVELS: process.env.NEXT_PUBLIC_FEATURE_UNFINISHED_LEVELS,
});
