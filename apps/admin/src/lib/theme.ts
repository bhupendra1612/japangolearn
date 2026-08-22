/**
 * Theme preference handling for the admin console.
 *
 * Three states are stored, not two: "system" (the default) means no
 * `data-theme` attribute is written at all, so the CSS media query decides and
 * the console follows the OS live. "light" and "dark" write the attribute,
 * which wins over the media query in both directions.
 */

export const THEME_STORAGE_KEY = "jgl-admin-theme";

export type ThemePreference = "light" | "dark" | "system";

/** The two themes that can actually be painted, once "system" is resolved. */
export type ResolvedTheme = "light" | "dark";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Runs before first paint, inlined in <head>, so a dark-theme admin never
 * flashes a white screen on load. Kept dependency-free and wrapped in try/catch
 * because localStorage throws outright when cookies are blocked.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;
