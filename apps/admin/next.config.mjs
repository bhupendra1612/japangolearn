import { withSentryConfig } from "@sentry/nextjs";
import { fileURLToPath } from "node:url";

const sentryEnabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
const sentryShim = fileURLToPath(new URL("./src/lib/sentry-shim.ts", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@japangolearn/content", "@japangolearn/database"],
  webpack(config) {
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
