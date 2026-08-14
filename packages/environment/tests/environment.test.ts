import { describe, expect, it } from "vitest";
import { PRODUCTION_SUPABASE_PROJECT_REF, validatePublicEnvironment } from "../src/index.js";

const valid = {
  appEnv: "staging",
  supabaseUrl: "https://staging-project.supabase.co",
  supabasePublicKey: "publishable-key",
};

describe("validatePublicEnvironment", () => {
  it("accepts isolated staging configuration", () => {
    expect(validatePublicEnvironment(valid)).toEqual(valid);
  });

  it.each(["development", "test", "preview", "staging"])(
    "rejects the production project in %s",
    (appEnv) => {
      expect(() =>
        validatePublicEnvironment({
          ...valid,
          appEnv,
          supabaseUrl: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
        })
      ).toThrow("must not connect to the production Supabase project");
    }
  );

  it("allows the production project only in production", () => {
    expect(
      validatePublicEnvironment({
        ...valid,
        appEnv: "production",
        supabaseUrl: `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
      }).appEnv
    ).toBe("production");
  });

  it("accepts local HTTP for local Supabase", () => {
    expect(
      validatePublicEnvironment({
        ...valid,
        appEnv: "development",
        supabaseUrl: "http://127.0.0.1:54321",
      }).supabaseUrl
    ).toBe("http://127.0.0.1:54321");
  });

  it("rejects missing values and non-HTTPS hosted URLs", () => {
    expect(() => validatePublicEnvironment({})).toThrow("Missing required environment variable");
    expect(() =>
      validatePublicEnvironment({ ...valid, supabaseUrl: "http://staging.supabase.co" })
    ).toThrow("must use HTTPS");
  });
});
