export const APP_ENVIRONMENTS: readonly AppEnvironment[];
export const PRODUCTION_SUPABASE_PROJECT_REF: "teylstfbjtutssnfmhhu";

export type AppEnvironment = "development" | "test" | "preview" | "staging" | "production";

export type PublicEnvironmentInput = {
  appEnv?: string;
  supabaseUrl?: string;
  supabasePublicKey?: string;
};

export type PublicEnvironment = {
  appEnv: AppEnvironment;
  supabaseUrl: string;
  supabasePublicKey: string;
};

export function validatePublicEnvironment(
  input: PublicEnvironmentInput,
  names?: {
    appEnvName?: string;
    supabaseUrlName?: string;
    supabasePublicKeyName?: string;
  }
): PublicEnvironment;
