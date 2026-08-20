export const DEFAULT_AUTHENTICATED_ROUTE = "/(tabs)";

// Where to land after the next successful sign-in. The auth screens cannot
// navigate there themselves: the moment a session exists, <Stack.Protected>
// removes the "(auth)" group from the navigator, and React Navigation drops
// navigation actions aimed at screens that are no longer registered. So the
// auth screens record their intent here and app/index.tsx performs the
// navigation once the new auth state has settled.
let pendingRedirect: string | null = null;

export function setPendingRedirect(route: string) {
  pendingRedirect = route;
}

export function consumePendingRedirect(): string | null {
  const value = pendingRedirect;
  pendingRedirect = null;
  return value;
}

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
