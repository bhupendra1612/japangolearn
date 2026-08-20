// Kept in sync with the web signup form (apps/web/src/app/(auth)/signup/page.tsx)
// so both platforms offer the same choices. The database trigger
// private.handle_new_user() validates these values and falls back to "N5".
export const JLPT_SIGNUP_LEVELS = [
  { value: "N5", label: "N5 — Complete Beginner", desc: "I'm just starting" },
  { value: "N4", label: "N4 — Elementary", desc: "I know hiragana & katakana" },
  { value: "N3", label: "N3 — Intermediate", desc: "I can have basic conversations" },
  { value: "N2", label: "N2 — Upper-Intermediate", desc: "I can read articles" },
  { value: "N1", label: "N1 — Advanced", desc: "I want native-level fluency" },
] as const;

export const DEFAULT_JLPT_LEVEL = "N5";
