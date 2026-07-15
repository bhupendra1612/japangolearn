export const DEFAULT_AUTHENTICATED_ROUTE = "/(tabs)";

export function getSafeRedirectTo(value?: string | string[]): string {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("://") ||
    candidate.startsWith("/(auth)") ||
    candidate === "/onboarding"
  ) {
    return DEFAULT_AUTHENTICATED_ROUTE;
  }

  return candidate;
}
