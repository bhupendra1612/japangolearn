import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@japangolearn/database";
import { execPnpmSync } from "../support/pnpm-process";

type Credentials = { email: string; password: string; id: string };

function localEnvironment() {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }

  const status = JSON.parse(
    execPnpmSync(["exec", "supabase", "status", "--output", "json"], {
      encoding: "utf8",
    })
  );
  return {
    url: status.API_URL,
    anonKey: status.ANON_KEY,
    serviceKey: status.SERVICE_ROLE_KEY,
  };
}

describe("award_xp RPC authorization and idempotency", () => {
  const environment = localEnvironment();
  const admin = createClient<Database>(environment.url, environment.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let userOne: Credentials;
  let userTwo: Credentials;
  let clientOne: SupabaseClient<Database>;
  let clientTwo: SupabaseClient<Database>;

  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const password = "P0-test-password-123!";
    const first = await admin.auth.admin.createUser({
      email: `xp-one-${suffix}@example.test`,
      password,
      email_confirm: true,
    });
    const second = await admin.auth.admin.createUser({
      email: `xp-two-${suffix}@example.test`,
      password,
      email_confirm: true,
    });
    if (first.error || !first.data.user || second.error || !second.data.user) {
      throw first.error ?? second.error ?? new Error("Unable to create integration users");
    }

    userOne = { email: first.data.user.email!, password, id: first.data.user.id };
    userTwo = { email: second.data.user.email!, password, id: second.data.user.id };
    clientOne = createClient<Database>(environment.url, environment.anonKey);
    clientTwo = createClient<Database>(environment.url, environment.anonKey);
    await clientOne.auth.signInWithPassword(userOne);
    await clientTwo.auth.signInWithPassword(userTwo);
  });

  afterAll(async () => {
    if (userOne?.id) await admin.auth.admin.deleteUser(userOne.id);
    if (userTwo?.id) await admin.auth.admin.deleteUser(userTwo.id);
  });

  it("awards XP once for a retried attempt key", async () => {
    const attemptKey = `integration-${crypto.randomUUID()}`;
    const first = await clientOne.rpc("award_xp", {
      p_activity_type: "vocabulary_quiz",
      p_correct_answers: 4,
      p_total_questions: 5,
      p_attempt_key: attemptKey,
    });
    const retry = await clientOne.rpc("award_xp", {
      p_activity_type: "vocabulary_quiz",
      p_correct_answers: 4,
      p_total_questions: 5,
      p_attempt_key: attemptKey,
    });

    expect(first.error).toBeNull();
    expect(retry.error).toBeNull();
    expect(first.data?.[0]).toMatchObject({ xp_awarded: 20, was_duplicate: false });
    expect(retry.data?.[0]).toMatchObject({ xp_awarded: 20, was_duplicate: true });

    const ledger = await clientOne
      .from("xp_ledger")
      .select("amount")
      .eq("award_key", `quiz:${attemptKey}`);
    expect(ledger.data).toEqual([{ amount: 20 }]);

    const quest = await clientOne
      .from("daily_quest_completions")
      .select("quest_key")
      .eq("attempt_id", first.data![0].attempt_id);
    expect(quest.data).toEqual([{ quest_key: "vocabulary" }]);

    const questEvent = await clientOne
      .from("activity_events")
      .select("event_name")
      .eq("attempt_id", first.data![0].attempt_id)
      .eq("event_name", "learning.daily_quest_completed");
    expect(questEvent.data).toEqual([{ event_name: "learning.daily_quest_completed" }]);
  });

  it("rejects anonymous calls and direct ledger writes", async () => {
    const anonymous = createClient<Database>(environment.url, environment.anonKey);
    const rpc = await anonymous.rpc("award_xp", {
      p_activity_type: "grammar_quiz",
      p_correct_answers: 1,
      p_total_questions: 1,
      p_attempt_key: `anonymous-${crypto.randomUUID()}`,
    });
    expect(rpc.error).not.toBeNull();

    const directWrite = await clientOne.from("xp_ledger").insert({
      user_id: userOne.id,
      amount: 999,
      reason: "tamper",
      award_key: `tamper:${crypto.randomUUID()}`,
    });
    expect(directWrite.error).not.toBeNull();
  });

  it("does not expose one user's attempts to another user", async () => {
    const result = await clientTwo.from("learning_attempts").select("id").eq("user_id", userOne.id);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });
});
