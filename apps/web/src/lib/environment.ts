import { validatePublicEnvironment } from "@japangolearn/environment";

export const publicEnvironment = validatePublicEnvironment(
  {
    appEnv: process.env.NEXT_PUBLIC_APP_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabasePublicKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  {
    appEnvName: "NEXT_PUBLIC_APP_ENV",
    supabaseUrlName: "NEXT_PUBLIC_SUPABASE_URL",
    supabasePublicKeyName: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  }
);

export const publicApiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8787").replace(
  /\/$/,
  ""
);
