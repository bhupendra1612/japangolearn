import AsyncStorage from "@react-native-async-storage/async-storage";
import { captureException } from "@/lib/monitoring";

/**
 * A network-first, cache-fallback store for reference content.
 *
 * The app reads every lesson from Supabase on mount, so a train tunnel turned
 * it into a set of blank screens. Study material barely changes, which makes it
 * a good fit for caching — but the cache is a fallback, never a preference:
 * a successful request always wins and always refreshes the copy. That way a
 * content update is never hidden behind a stale cache, and losing signal costs
 * the learner nothing.
 *
 * There is deliberately no expiry. Content that is a month old still teaches
 * hiragana correctly, and expiring it would only turn a working offline screen
 * into an empty one.
 */

const PREFIX = "cache:v1:";

type Envelope<T> = { savedAt: number; data: T };

export type CachedValue<T> = { data: T; savedAt: number };

export async function readCache<T>(key: string): Promise<CachedValue<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    return { data: parsed.data, savedAt: parsed.savedAt };
  } catch (error) {
    // A corrupt entry must never break the screen — fall through to the network.
    captureException(error, { cacheKey: key, operation: "read" });
    return null;
  }
}

export async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    const envelope: Envelope<T> = { savedAt: Date.now(), data };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(envelope));
  } catch (error) {
    // Running out of storage should not stop the user studying.
    captureException(error, { cacheKey: key, operation: "write" });
  }
}

/** Human-friendly age for the "showing saved content" notice. */
export function describeAge(savedAt: number): string {
  const minutes = Math.floor((Date.now() - savedAt) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}
