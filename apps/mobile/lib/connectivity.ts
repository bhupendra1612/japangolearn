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

import { publicEnvironment } from "./environment";

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
  "timed out",
  "timeout",
  "aborted",
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
  if (message && OFFLINE_SIGNATURES.some((signature) => message.includes(signature))) return true;
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" && (status === 0 || status === 408 || status >= 500);
  }
  return false;
}

const CONNECTIVITY_CHECK_INTERVAL_MS = 30_000;
const CONNECTIVITY_CHECK_TIMEOUT_MS = 5_000;

/**
 * Checks reachability without requiring a native network-information module.
 * Any successful Supabase health response means queued writes can be retried.
 */
export async function checkConnectivity(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONNECTIVITY_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(`${publicEnvironment.supabaseUrl}/auth/v1/health`, {
      method: "GET",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Polls reachability and invokes the callback whenever the service is reachable.
 * Rechecking while online also retries entries queued after a transient server
 * failure. The caller can stop the monitor on unmount.
 */
export function subscribeToConnectivity(
  onOnline: () => void,
  intervalMs = CONNECTIVITY_CHECK_INTERVAL_MS
): () => void {
  let stopped = false;

  const check = async () => {
    const online = await checkConnectivity();
    if (stopped) return;
    if (online) onOnline();
  };

  void check();
  const interval = setInterval(() => void check(), intervalMs);
  return () => {
    stopped = true;
    clearInterval(interval);
  };
}
