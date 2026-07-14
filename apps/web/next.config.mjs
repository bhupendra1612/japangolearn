import { withSentryConfig } from "@sentry/nextjs";
import { fileURLToPath } from "node:url";

const sentryEnabled = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
const sentryShim = fileURLToPath(new URL("./src/lib/sentry-shim.ts", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  transpilePackages: ["@japangolearn/content", "@japangolearn/database"],
  images: {
    // Keep the first Workers deployment independent of Cloudflare Images billing.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "teylstfbjtutssnfmhhu.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  webpack(config) {
    if (!sentryEnabled) {
      config.resolve.alias["@sentry/nextjs"] = sentryShim;
    }
    return config;
  },
};

const sentryConfig = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_WEB_PROJECT ?? process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
};

export default sentryEnabled ? withSentryConfig(nextConfig, sentryConfig) : nextConfig;
