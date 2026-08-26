import { describe, expect, it } from "vitest";
import { apiErrorResponseSchema } from "@japangolearn/api-contracts";
import { worker } from "../src";

const env: Cloudflare.Env = {
  APP_ENV: "production",
  ALLOWED_ORIGINS:
    "https://japangolearn.com,https://www.japangolearn.com,http://localhost:3000,http://127.0.0.1:3000",
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_PUBLISHABLE_KEY: "test-key",
  BUNNY_STREAM_LIBRARY_ID: "test-library",
  BUNNY_STREAM_API_KEY: "test-key",
};

describe("API worker", () => {
  it("serves a versioned health envelope with a request id", async () => {
    const response = await worker.fetch(new Request("https://api.test/api/v1/health"), env);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
    await expect(response.json()).resolves.toMatchObject({
      data: { status: "ok", environment: "production" },
      meta: { requestId: response.headers.get("x-request-id") },
    });
  });

  it("returns stable errors without leaking internals", async () => {
    const response = await worker.fetch(new Request("https://api.test/api/v1/missing"), env);
    expect(response.status).toBe(404);
    expect(apiErrorResponseSchema.parse(await response.json()).error.code).toBe("NOT_FOUND");
  });

  it("fails closed when a non-production environment targets production", async () => {
    const response = await worker.fetch(new Request("https://api.test/api/v1/health"), {
      ...env,
      APP_ENV: "staging",
      SUPABASE_URL: "https://teylstfbjtutssnfmhhu.supabase.co",
    });
    expect(response.status).toBe(500);
    expect((await response.json()) as object).not.toHaveProperty("message");
  });
});
