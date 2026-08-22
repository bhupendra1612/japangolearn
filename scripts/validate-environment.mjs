import { validatePublicEnvironment } from "../packages/environment/src/index.js";

function validateGroup(input, names) {
  const configured = Object.values(input).some((value) => value !== undefined && value !== "");
  if (configured) {
    validatePublicEnvironment(input, names);
  }
}

validateGroup(
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

validateGroup(
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

validateGroup(
  {
    appEnv: process.env.APP_ENV,
    supabaseUrl: process.env.SUPABASE_URL,
    supabasePublicKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  },
  {
    appEnvName: "APP_ENV",
    supabaseUrlName: "SUPABASE_URL",
    supabasePublicKeyName: "SUPABASE_PUBLISHABLE_KEY",
  }
);

console.log("Environment isolation checks passed.");
