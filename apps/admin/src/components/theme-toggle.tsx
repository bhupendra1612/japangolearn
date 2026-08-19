"use client";

import { useCallback, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  THEME_STORAGE_KEY,
  isThemePreference,
  type ThemePreference,
  type ResolvedTheme,
} from "@/lib/theme";

/** Cycles in the order an admin expects: light -> dark -> follow the OS. */
const ORDER: ThemePreference[] = ["light", "dark", "system"];

const LABEL: Record<ThemePreference, string> = {
  light: "Light theme",
  dark: "Dark theme",
  system: "System theme",
};

/* ---------------------------------------------------------------------------
   The stored preference and the OS setting are both external state, so they are
   read through useSyncExternalStore rather than mirrored into useState inside
   an effect. That keeps the server render ("system") identical to the first
   hydration render, then swaps in the real value once hydration completes — no
   mismatch warning and no cascading render.
   --------------------------------------------------------------------------- */

const preferenceListeners = new Set<() => void>();

function notifyPreferenceChanged() {
  for (const listener of preferenceListeners) listener();
}

function subscribeToPreference(onStoreChange: () => void) {
  preferenceListeners.add(onStoreChange);
  /* "storage" fires only in *other* tabs, which is exactly what it is for
     here — this tab is covered by notifyPreferenceChanged. */
  window.addEventListener("storage", onStoreChange);

  return () => {
    preferenceListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function readServerPreference(): ThemePreference {
  return "system";
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeToSystemTheme(onStoreChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function readSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function readServerSystemTheme(): ResolvedTheme {
  return "light";
}

function applyPreference(preference: ThemePreference) {
  const root = document.documentElement;

  /* "system" removes the attribute rather than writing a resolved value, so the
     media query in globals.css stays in charge and the console keeps following
     the OS if it changes while the tab is open. */
  if (preference === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", preference);
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* Storage is blocked; the theme still applies for this page view. */
  }
}

function ThemeIcon({ preference, size = 18 }: { preference: ThemePreference; size?: number }) {
  if (preference === "system") return <Monitor size={size} aria-hidden="true" />;
  if (preference === "dark") return <Moon size={size} aria-hidden="true" />;
  return <Sun size={size} aria-hidden="true" />;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const preference = useSyncExternalStore(
    subscribeToPreference,
    readPreference,
    readServerPreference
  );
  const systemTheme = useSyncExternalStore(
    subscribeToSystemTheme,
    readSystemTheme,
    readServerSystemTheme
  );

  const cycle = useCallback(() => {
    const next = ORDER[(ORDER.indexOf(readPreference()) + 1) % ORDER.length];
    applyPreference(next);
    notifyPreferenceChanged();
  }, []);

  const resolved: ResolvedTheme = preference === "system" ? systemTheme : preference;
  const next = ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length];
  const current = preference === "system" ? `${LABEL.system} (${resolved})` : LABEL[preference];

  return (
    <button
      type="button"
      onClick={cycle}
      className={`icon-button ${className}`.trim()}
      title={`${current} — switch to ${LABEL[next].toLowerCase()}`}
      aria-label={`${current} active. Switch to ${LABEL[next].toLowerCase()}.`}
    >
      <ThemeIcon preference={preference} />
    </button>
  );
}
