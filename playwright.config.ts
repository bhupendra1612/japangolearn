import { defineConfig, devices } from "@playwright/test";
import { execPnpmSync } from "./tests/support/pnpm-process";

function localSupabaseEnvironment() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    };
  }

  const status = JSON.parse(
    execPnpmSync(["exec", "supabase", "status", "--output", "json"], {
      encoding: "utf8",
    })
  );
  return {
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
  };
}

const supabase = localSupabaseEnvironment();
Object.assign(process.env, supabase);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @japangolearn/web dev",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        ...supabase,
        NEXT_PUBLIC_ANALYTICS_ENABLED: "false",
        NEXT_PUBLIC_FEATURE_AI: "false",
        NEXT_PUBLIC_FEATURE_PREMIUM: "false",
        NEXT_PUBLIC_FEATURE_UNFINISHED_LEVELS: "false",
      },
    },
    {
      command: "pnpm --filter @japangolearn/admin dev",
      url: "http://127.0.0.1:3001/login",
      reuseExistingServer: !process.env.CI,
      env: { ...process.env, ...supabase },
    },
  ],
});
