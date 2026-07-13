import { Sentry } from "@/lib/monitoring";

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

const analyticsEndpoint = process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT;
const appEnvironment = process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? "development" : "production");

export function trackEvent(name: string, properties: AnalyticsProperties = {}) {
  Sentry.addBreadcrumb({
    category: "analytics",
    message: name,
    data: properties,
    level: "info",
  });

  if (!analyticsEndpoint) {
    return;
  }

  void fetch(analyticsEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      name,
      properties,
      app: "mobile",
      environment: appEnvironment,
      timestamp: new Date().toISOString(),
    }),
  }).catch((error: unknown) => {
    Sentry.captureException(error);
  });
}
