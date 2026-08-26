export const APP_ENVIRONMENTS = ["development", "test", "preview", "staging", "production"];

export const PRODUCTION_SUPABASE_PROJECT_REF = "teylstfbjtutssnfmhhu";

const NON_PRODUCTION_ENVIRONMENTS = new Set(["development", "test", "preview", "staging"]);

/**
 * @typedef {"development" | "test" | "preview" | "staging" | "production"} AppEnvironment
 * @typedef {{ appEnv?: string, supabaseUrl?: string, supabasePublicKey?: string }} PublicEnvironmentInput
 * @typedef {{ appEnv: AppEnvironment, supabaseUrl: string, supabasePublicKey: string }} PublicEnvironment
 */

/** @param {string | undefined} value @param {string} name */
function required(value, name) {
  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

/** @param {string} value */
function parseAppEnvironment(value) {
  if (!APP_ENVIRONMENTS.includes(value)) {
    throw new Error(`Invalid app environment: ${value}`);
  }
  return /** @type {AppEnvironment} */ (value);
}

/**
 * Validates the public Supabase configuration shared by web, admin, mobile, and API.
 * Preview and staging are intentionally forbidden from targeting production.
 *
 * @param {PublicEnvironmentInput} input
 * @param {{ appEnvName?: string, supabaseUrlName?: string, supabasePublicKeyName?: string }} [names]
 * @returns {PublicEnvironment}
 */
export function validatePublicEnvironment(input, names = {}) {
  const appEnv = parseAppEnvironment(required(input.appEnv, names.appEnvName ?? "APP_ENV"));
  const supabaseUrl = required(input.supabaseUrl, names.supabaseUrlName ?? "SUPABASE_URL");
  const supabasePublicKey = required(
    input.supabasePublicKey,
    names.supabasePublicKeyName ?? "SUPABASE_PUBLISHABLE_KEY"
  );

  let parsedUrl;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error(`Invalid Supabase URL: ${supabaseUrl}`);
  }

  const isLocal = ["127.0.0.1", "localhost"].includes(parsedUrl.hostname);
  if (!isLocal && parsedUrl.protocol !== "https:") {
    throw new Error("Hosted Supabase URLs must use HTTPS");
  }

  if (
    NON_PRODUCTION_ENVIRONMENTS.has(appEnv) &&
    parsedUrl.hostname.toLowerCase().includes(PRODUCTION_SUPABASE_PROJECT_REF)
  ) {
    throw new Error(`${appEnv} must not connect to the production Supabase project`);
  }

  return { appEnv, supabaseUrl: parsedUrl.toString().replace(/\/$/, ""), supabasePublicKey };
}
