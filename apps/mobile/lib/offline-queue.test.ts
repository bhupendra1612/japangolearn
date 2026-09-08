/// <reference types="vitest" />

import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@japangolearn/database";
import { offlineQueueStorageKey } from "@japangolearn/core";
import {
  addPracticeListItemWithQueue,
  createPracticeListWithQueue,
  discardOfflineQueueEntry,
  drainOfflineQueue,
  getOfflineQueueSize,
  submitLearningAttemptWithQueue,
} from "./offline-queue";

const storage = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  };
});

vi.mock("@react-native-async-storage/async-storage", () => ({ default: storage }));
vi.mock("@/lib/monitoring", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/environment", () => ({
  publicEnvironment: {
    appEnv: "test",
    supabaseUrl: "https://example.test",
    supabasePublicKey: "test-key",
  },
}));
vi.mock("@/lib/connectivity", () => ({
  isOfflineError: (error: unknown) =>
    error instanceof Error && error.message.toLowerCase().includes("network request failed"),
}));

function fakeClient(userId: string, response: { error: unknown }) {
  const client = {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: userId }, access_token: "test-token" } },
      })),
    },
    rpc: vi.fn(async () => response),
  } as unknown as SupabaseClient<Database> & {
    auth: { getSession: ReturnType<typeof vi.fn> };
    rpc: ReturnType<typeof vi.fn>;
    __offlineReplayClient: () => SupabaseClient<Database>;
  };
  client.__offlineReplayClient = () => client;
  return client;
}

function fakeListClient(userId: string, response: { error: unknown }) {
  const builder = {
    upsert: vi.fn(async () => response),
  };
  const client = {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: userId }, access_token: "test-token" } },
      })),
    },
    from: vi.fn(() => builder),
    builder,
  } as unknown as SupabaseClient<Database> & {
    builder: typeof builder;
    __offlineReplayClient: () => SupabaseClient<Database>;
  };
  client.__offlineReplayClient = () => client;
  return client;
}

describe("mobile offline queue adapter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    storage.values.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("queues once, replays in order, and acknowledges the entry", async () => {
    const offlineClient = fakeClient("user-1", {
      error: new Error("Network request failed"),
    });
    const request = {
      activityType: "practice_quiz",
      attemptKey: "attempt-1",
      answers: [],
    };

    expect(await submitLearningAttemptWithQueue(offlineClient, request)).toEqual({
      status: "queued",
    });
    expect(await submitLearningAttemptWithQueue(offlineClient, request)).toEqual({
      status: "queued",
    });
    expect(await getOfflineQueueSize(offlineClient)).toBe(1);

    vi.advanceTimersByTime(31_000);
    offlineClient.rpc.mockResolvedValue({ error: null });
    expect(await drainOfflineQueue(offlineClient)).toMatchObject({
      processed: 1,
      remaining: 0,
      status: "complete",
    });
    expect(offlineClient.rpc).toHaveBeenCalledTimes(2);
    expect(await getOfflineQueueSize(offlineClient)).toBe(0);
  });

  it("does not replay another user's queue", async () => {
    const userOne = fakeClient("user-1", {
      error: new Error("Network request failed"),
    });
    await submitLearningAttemptWithQueue(userOne, {
      activityType: "writing_quiz",
      attemptKey: "attempt-user-1",
      answers: [],
    });

    const userTwo = fakeClient("user-2", { error: null });
    expect(await drainOfflineQueue(userTwo)).toMatchObject({
      processed: 0,
      remaining: 0,
      status: "empty",
    });
    expect(userTwo.rpc).not.toHaveBeenCalled();
    expect(await getOfflineQueueSize(userOne)).toBe(1);
  });

  it("rejects a callback bound to a different authenticated user", async () => {
    const client = fakeClient("user-2", { error: null });
    const result = await submitLearningAttemptWithQueue(client, {
      activityType: "practice_quiz",
      attemptKey: "stale-user-attempt",
      answers: [],
      expectedUserId: "user-1",
    });

    expect(result.status).toBe("failed");
    expect(client.rpc).not.toHaveBeenCalled();
    expect(await getOfflineQueueSize(client)).toBe(0);
  });

  it("queues an idempotent practice-list membership change", async () => {
    const client = fakeListClient("user-1", {
      error: new Error("Network request failed"),
    });

    expect(
      await addPracticeListItemWithQueue(client, {
        listId: "list-1",
        itemType: "kanji",
        itemId: 42,
      })
    ).toEqual({ status: "queued" });
    expect(await getOfflineQueueSize(client)).toBe(1);

    vi.advanceTimersByTime(31_000);
    client.builder.upsert.mockResolvedValue({ error: null });
    expect(await drainOfflineQueue(client)).toMatchObject({
      processed: 1,
      remaining: 0,
      status: "complete",
    });
    expect(client.builder.upsert).toHaveBeenCalledTimes(2);
  });

  it("keeps a queued item behind its queued list creation", async () => {
    const client = fakeListClient("user-1", {
      error: new Error("Network request failed"),
    });

    const created = await createPracticeListWithQueue(client, {
      title: "Offline list",
      sortOrder: 1,
    });
    expect(created.status).toBe("queued");
    expect(created.data?.id).toBeTruthy();

    const added = await addPracticeListItemWithQueue(client, {
      listId: created.data!.id,
      itemType: "kanji",
      itemId: 42,
    });
    expect(added).toEqual({ status: "queued" });
    expect(await getOfflineQueueSize(client)).toBe(2);

    vi.advanceTimersByTime(31_000);
    client.builder.upsert.mockResolvedValue({ error: null });
    expect(await drainOfflineQueue(client)).toMatchObject({
      processed: 2,
      remaining: 0,
      status: "complete",
    });
    expect(client.builder.upsert).toHaveBeenCalledTimes(3);
  });

  it("does not let a permanent failure block later attempts", async () => {
    const client = fakeClient("user-1", { error: new Error("Network request failed") });
    const request = {
      activityType: "practice_quiz",
      answers: [],
    };

    await submitLearningAttemptWithQueue(client, { ...request, attemptKey: "attempt-1" });
    await submitLearningAttemptWithQueue(client, { ...request, attemptKey: "attempt-2" });

    vi.advanceTimersByTime(31_000);
    client.rpc
      .mockResolvedValueOnce({ error: { message: "Invalid answer payload" } })
      .mockResolvedValue({ error: null });

    expect(await drainOfflineQueue(client)).toMatchObject({
      processed: 1,
      remaining: 1,
      status: "failed",
    });
    expect(await getOfflineQueueSize(client)).toBe(1);
    expect(await discardOfflineQueueEntry(client, "attempt-1")).toBe(true);
    expect(await getOfflineQueueSize(client)).toBe(0);
  });

  it("persists before sending and serializes concurrent attempts", async () => {
    const calls: string[] = [];
    const client = fakeClient("user-1", { error: null });
    client.rpc.mockImplementation(async (_name, args) => {
      calls.push((args as { p_attempt_key: string }).p_attempt_key);
      return { error: null };
    });

    await Promise.all([
      submitLearningAttemptWithQueue(client, {
        activityType: "practice_quiz",
        attemptKey: "attempt-1",
        answers: [],
      }),
      submitLearningAttemptWithQueue(client, {
        activityType: "practice_quiz",
        attemptKey: "attempt-2",
        answers: [],
      }),
    ]);

    expect(calls).toEqual(["attempt-1", "attempt-2"]);
    expect(await getOfflineQueueSize(client)).toBe(0);
  });

  it("keeps an in-flight operation durable if the process loses its response", async () => {
    let resolveRpc!: (result: { error: null }) => void;
    let markRpcStarted!: () => void;
    const rpcStarted = new Promise<void>((resolve) => {
      markRpcStarted = resolve;
    });
    const client = fakeClient("user-1", { error: null });
    client.rpc.mockImplementation(
      () =>
        new Promise((resolveResult) => {
          resolveRpc = resolveResult;
          markRpcStarted();
        })
    );

    const submission = submitLearningAttemptWithQueue(client, {
      activityType: "practice_quiz",
      attemptKey: "attempt-in-flight",
      answers: [],
    });
    await rpcStarted;
    const raw = storage.values.get(offlineQueueStorageKey("user-1", "test:https://example.test"));
    expect(raw ? JSON.parse(raw) : []).toHaveLength(1);

    resolveRpc({ error: null });
    await submission;
    expect(await getOfflineQueueSize(client)).toBe(0);
  });

  it("pauses a drain when the authenticated user changes mid-request", async () => {
    let currentUserId = "user-1";
    const client = fakeClient("user-1", { error: null });
    client.auth.getSession.mockImplementation(async () => ({
      data: { session: { user: { id: currentUserId }, access_token: "test-token" } },
    }));
    client.rpc.mockImplementation(async () => {
      currentUserId = "user-2";
      return { error: null };
    });

    const result = await submitLearningAttemptWithQueue(client, {
      activityType: "practice_quiz",
      attemptKey: "attempt-auth-switch",
      answers: [],
    });
    expect(result.status).toBe("failed");

    currentUserId = "user-1";
    expect(await getOfflineQueueSize(client)).toBe(1);
  });
});
