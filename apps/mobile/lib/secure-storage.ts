import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { captureException } from "@/lib/monitoring";

/**
 * Storage adapter for the Supabase auth session.
 *
 * Sessions used to live in AsyncStorage, which is unencrypted and (with
 * android:allowBackup="true") can end up in a Google Drive backup. This keeps
 * them in the OS keystore/keychain instead.
 *
 * Two wrinkles this handles:
 *  - SecureStore warns above ~2048 bytes per value, and a Supabase session with
 *    user metadata can exceed that, so values are split across chunk keys.
 *  - Existing installs already have a session in AsyncStorage. The first read
 *    migrates it across so nobody gets silently signed out by this change.
 *
 * SecureStore has no web implementation, so the web build keeps using
 * AsyncStorage (which is localStorage there).
 */

const CHUNK_SIZE = 1800;
const isWeb = Platform.OS === "web";

// SecureStore only accepts alphanumerics, ".", "-" and "_".
function chunkKey(key: string, index: number) {
  return `${key}.${index}`;
}

function countKey(key: string) {
  return `${key}.chunks`;
}

async function readChunked(key: string): Promise<string | null> {
  const rawCount = await SecureStore.getItemAsync(countKey(key));
  if (rawCount === null) return null;

  const count = Number.parseInt(rawCount, 10);
  if (!Number.isInteger(count) || count < 1) return null;

  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(chunkKey(key, i));
    // A missing chunk means the stored value is corrupt; treat it as absent so
    // the caller re-authenticates rather than parsing a truncated session.
    if (part === null) return null;
    parts.push(part);
  }
  return parts.join("");
}

async function clearChunked(key: string) {
  const rawCount = await SecureStore.getItemAsync(countKey(key));
  const count = rawCount ? Number.parseInt(rawCount, 10) : 0;

  if (Number.isInteger(count) && count > 0) {
    for (let i = 0; i < count; i++) {
      await SecureStore.deleteItemAsync(chunkKey(key, i));
    }
  }
  await SecureStore.deleteItemAsync(countKey(key));
}

async function writeChunked(key: string, value: string) {
  const previous = await SecureStore.getItemAsync(countKey(key));
  const previousCount = previous ? Number.parseInt(previous, 10) : 0;

  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }

  for (let i = 0; i < chunks.length; i++) {
    await SecureStore.setItemAsync(chunkKey(key, i), chunks[i]);
  }
  await SecureStore.setItemAsync(countKey(key), String(chunks.length));

  // Drop chunks left over from a longer previous value.
  if (Number.isInteger(previousCount)) {
    for (let i = chunks.length; i < previousCount; i++) {
      await SecureStore.deleteItemAsync(chunkKey(key, i));
    }
  }
}

export const secureAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    if (isWeb) return AsyncStorage.getItem(key);

    try {
      const stored = await readChunked(key);
      if (stored !== null) return stored;

      // One-time migration from the old unencrypted location.
      const legacy = await AsyncStorage.getItem(key);
      if (legacy !== null) {
        await writeChunked(key, legacy);
        await AsyncStorage.removeItem(key);
        return legacy;
      }

      return null;
    } catch (error) {
      captureException(error, { scope: "secureAuthStorage.getItem", key });
      // Fall back rather than hard-failing app startup.
      return AsyncStorage.getItem(key);
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) return AsyncStorage.setItem(key, value);

    try {
      await writeChunked(key, value);
    } catch (error) {
      captureException(error, { scope: "secureAuthStorage.setItem", key });
      await AsyncStorage.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    if (isWeb) return AsyncStorage.removeItem(key);

    try {
      await clearChunked(key);
    } catch (error) {
      captureException(error, { scope: "secureAuthStorage.removeItem", key });
    }
    // Always clear the legacy copy too.
    await AsyncStorage.removeItem(key);
  },
};
