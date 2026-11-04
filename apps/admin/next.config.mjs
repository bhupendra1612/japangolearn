import { withSentryConfig } from "@sentry/nextjs";
import { fileURLToPath } from "node:url";
import { validatePublicEnvironment } from "@japangolearn/environment";

validatePublicEnvironment(
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

const sentryEnabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
const sentryShim = fileURLToPath(new URL("./src/lib/sentry-shim.ts", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@japangolearn/content", "@japangolearn/database"],
  // Production builds stay on webpack (`next build --webpack`) so the OpenNext
  // output matches what has been running on Workers. `next dev` uses Turbopack
  // by default in Next 16; give it the same Sentry shim alias.
  turbopack: {
    resolveAlias: sentryEnabled ? {} : { "@sentry/nextjs": "./src/lib/sentry-shim.ts" },
  },
  webpack(config, { dev }) {
    if (!dev) {
      config.cache = false;
    }
    if (!sentryEnabled) {
      config.resolve.alias["@sentry/nextjs"] = sentryShim;
    }
    return config;
  },
};

const sentryConfig = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_ADMIN_PROJECT ?? process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
};

export default sentryEnabled ? withSentryConfig(nextConfig, sentryConfig) : nextConfig;
