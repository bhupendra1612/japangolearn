export const ANALYTICS_EVENTS = [
  "auth.signup_started",
  "auth.signup_completed",
  "auth.login_completed",
  "learning.quiz_started",
  "learning.attempt_completed",
  "learning.daily_quest_completed",
  "navigation.feature_blocked",
  "admin.authorization_denied",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];
export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  properties?: AnalyticsProperties;
  source: "web" | "mobile" | "admin";
  timestamp: string;
};

export function isAnalyticsEventName(value: string): value is AnalyticsEventName {
  return (ANALYTICS_EVENTS as readonly string[]).includes(value);
}
