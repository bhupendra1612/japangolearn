/**
 * Tells a lost connection apart from a server that answered badly.
 *
 * Done by inspecting the failure rather than with NetInfo or expo-network,
 * because both are native modules: adding one would force a new store build and
 * could not reach existing installs over the air. Inspecting the error needs no
 * native code and answers the question that actually matters — whether the
 * request left the device at all.
 *
 * The distinction is worth drawing. "Check your connection" is wrong and
 * slightly insulting when the user's connection is fine and the database is
 * down, and "something went wrong" is unhelpful when they are in a tunnel.
 */

/** Fetch failed before the server replied — react-native, web, and undici wordings. */
const OFFLINE_SIGNATURES = [
  "network request failed",
  "failed to fetch",
  "network error",
  "load failed",
  "networkerror",
  "err_internet_disconnected",
  "err_network",
  "err_name_not_resolved",
  "unable to resolve host",
  "connection refused",
  "econnrefused",
  "enotfound",
  "etimedout",
  "socket hang up",
];

function messageOf(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }
  return "";
}

/**
 * True when the request never reached the server.
 *
 * supabase-js catches the underlying fetch rejection and hands back an error
 * object rather than throwing, so the transport failure survives only in the
 * message — hence matching on text rather than on an error type.
 */
export function isOfflineError(error: unknown): boolean {
  const message = messageOf(error).toLowerCase();
  if (!message) return false;
  return OFFLINE_SIGNATURES.some((signature) => message.includes(signature));
}
