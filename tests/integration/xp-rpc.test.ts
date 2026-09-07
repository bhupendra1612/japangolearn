import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@japangolearn/database";
import { execPnpmSync } from "../support/pnpm-process";

type Credentials = { email: string; password: string; id: string };
type VocabularyFixture = { id: number; english: string };

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

describe("learning-attempt submission authorization and idempotency", () => {
  const environment = localEnvironment();
  const admin = createClient<Database>(environment.url, environment.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let userOne: Credentials;
  let userTwo: Credentials;
  let vocabularyFixture!: VocabularyFixture;
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

    const vocabulary = await admin.from("vocabulary").select("id, english").limit(1).single();
    if (vocabulary.error || !vocabulary.data) {
      throw vocabulary.error ?? new Error("Unable to load a vocabulary fixture");
    }
    vocabularyFixture = vocabulary.data;
  });

  afterAll(async () => {
    if (userOne?.id) await admin.auth.admin.deleteUser(userOne.id);
    if (userTwo?.id) await admin.auth.admin.deleteUser(userTwo.id);
  });

  it("awards XP once for a retried attempt key", async () => {
    const attemptKey = `integration-${crypto.randomUUID()}`;
    const answers = [
      {
        item_type: "vocabulary",
        item_id: String(vocabularyFixture.id),
        answer: vocabularyFixture.english,
        is_correct: false,
        correct_answer: "client-controlled value",
      },
    ];
    const first = await clientOne.rpc("submit_learning_attempt", {
      p_activity_type: "vocabulary_quiz",
      p_attempt_key: attemptKey,
      p_answers: answers,
    });
    const retry = await clientOne.rpc("submit_learning_attempt", {
      p_activity_type: "vocabulary_quiz",
      p_attempt_key: attemptKey,
      p_answers: answers,
    });

    expect(first.error).toBeNull();
    expect(retry.error).toBeNull();
    expect(first.data?.[0]).toMatchObject({ xp_awarded: 5, was_duplicate: false });
    expect(retry.data?.[0]).toMatchObject({ xp_awarded: 5, was_duplicate: true });

    const ledger = await clientOne
      .from("xp_ledger")
      .select("amount")
      .eq("award_key", `quiz:${attemptKey}`);
    expect(ledger.data).toEqual([{ amount: 5 }]);

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

  it("rejects aggregate scores and derives correctness from the submitted answer", async () => {
    const legacyCall = await clientOne.rpc("award_xp", {
      p_activity_type: "vocabulary_quiz",
      p_correct_answers: 1,
      p_total_questions: 1,
      p_attempt_key: `legacy-${crypto.randomUUID()}`,
    } as never);
    expect(legacyCall.error).not.toBeNull();

    const emptyAnswers = await clientOne.rpc("award_xp", {
      p_activity_type: "practice_quiz",
      p_attempt_key: `empty-${crypto.randomUUID()}`,
      p_answers: [],
    });
    expect(emptyAnswers.error).not.toBeNull();

    const attemptKey = `derived-${crypto.randomUUID()}`;
    const result = await clientOne.rpc("submit_learning_attempt", {
      p_activity_type: "practice_quiz",
      p_attempt_key: attemptKey,
      p_answers: [
        {
          item_type: "vocabulary",
          item_id: String(vocabularyFixture.id),
          answer: "definitely-not-the-answer",
          is_correct: true,
          correct_answer: vocabularyFixture.english,
        },
      ],
    });

    expect(result.error).toBeNull();
    expect(result.data?.[0]).toMatchObject({ xp_awarded: 0, was_duplicate: false });

    const attempt = await clientOne
      .from("learning_attempts")
      .select("correct_answers, total_questions")
      .eq("id", result.data![0].attempt_id)
      .single();
    expect(attempt.data).toEqual({ correct_answers: 0, total_questions: 1 });
  });

  it("updates canonical mastery and the selected practice-list projection together", async () => {
    const list = await clientTwo
      .from("practice_lists")
      .insert({ user_id: userTwo.id, title: "Pipeline fixture", is_smart_list: false })
      .select("id")
      .single();
    expect(list.error).toBeNull();
    expect(list.data).not.toBeNull();

    const item = await clientTwo
      .from("practice_list_items")
      .insert({
        list_id: list.data!.id,
        item_type: "vocabulary",
        item_id: vocabularyFixture.id,
      })
      .select("id")
      .single();
    expect(item.error).toBeNull();
    expect(item.data).not.toBeNull();

    const directUpdate = await clientTwo
      .from("practice_list_items")
      .update({ mastery_score: 100 })
      .eq("id", item.data!.id);
    expect(directUpdate.error).not.toBeNull();

    const result = await clientTwo.rpc("submit_learning_attempt", {
      p_activity_type: "practice_quiz",
      p_attempt_key: `pipeline-${crypto.randomUUID()}`,
      p_answers: [
        {
          item_type: "vocabulary",
          item_id: String(vocabularyFixture.id),
          answer: vocabularyFixture.english,
        },
      ],
      p_practice_list_id: list.data!.id,
    });
    expect(result.error).toBeNull();

    const [mastery, projection] = await Promise.all([
      clientTwo
        .from("mastery_records")
        .select("mastery_score, correct_count, incorrect_count")
        .eq("user_id", userTwo.id)
        .eq("item_type", "vocabulary")
        .eq("item_id", String(vocabularyFixture.id))
        .single(),
      clientTwo
        .from("practice_list_items")
        .select("mastery_score, last_reviewed")
        .eq("id", item.data!.id)
        .single(),
    ]);
    expect(mastery.error).toBeNull();
    expect(projection.error).toBeNull();
    expect(mastery.data).toMatchObject({ mastery_score: 20, correct_count: 1, incorrect_count: 0 });
    expect(Number(projection.data?.mastery_score)).toBe(Number(mastery.data?.mastery_score));
    expect(projection.data?.last_reviewed).not.toBeNull();
  });

  it("rejects anonymous calls and direct ledger writes", async () => {
    const anonymous = createClient<Database>(environment.url, environment.anonKey);
    const rpc = await anonymous.rpc("submit_learning_attempt", {
      p_activity_type: "grammar_quiz",
      p_attempt_key: `anonymous-${crypto.randomUUID()}`,
      p_answers: [],
    });
    expect(rpc.error).not.toBeNull();

    const directWrite = await clientOne.from("xp_ledger").insert({
      user_id: userOne.id,
      amount: 999,
      reason: "tamper",
      award_key: `tamper:${crypto.randomUUID()}`,
    });
    expect(directWrite.error).not.toBeNull();

    const directStreak = await clientOne.rpc("increment_streak");
    expect(directStreak.error).not.toBeNull();
  });

  it("does not expose one user's attempts to another user", async () => {
    const result = await clientTwo.from("learning_attempts").select("id").eq("user_id", userOne.id);
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });
});
