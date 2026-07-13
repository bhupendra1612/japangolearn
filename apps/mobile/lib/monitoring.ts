import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

let initialized = false;

export function initMonitoring() {
  if (initialized) {
    return;
  }

  initialized = true;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? "development" : "production"),
    release: `${Constants.expoConfig?.slug ?? "japangolearn-mobile"}@${
      Constants.expoConfig?.version ?? "0.0.0"
    }`,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
  });
}

export { Sentry };
