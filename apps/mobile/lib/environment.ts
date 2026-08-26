import { validatePublicEnvironment } from "@japangolearn/environment";

export const publicEnvironment = validatePublicEnvironment(
  {
    appEnv: process.env.EXPO_PUBLIC_APP_ENV,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublicKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
  {
    appEnvName: "EXPO_PUBLIC_APP_ENV",
    supabaseUrlName: "EXPO_PUBLIC_SUPABASE_URL",
    supabasePublicKeyName: "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  }
);
