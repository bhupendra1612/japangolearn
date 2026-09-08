import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  appendOfflineQueueEntry,
  createOfflineQueueEntry,
  markOfflineQueueEntryFailed,
  offlineQueueStorageKey,
  parseOfflineQueue,
  removeOfflineQueueEntry,
  serializeOfflineQueue,
  type OfflineJson,
  type OfflinePracticeListCreateOperation,
  type OfflinePracticeListDeleteOperation,
  type OfflinePracticeListItemAddOperation,
  type OfflinePracticeListItemRemoveOperation,
  type OfflinePracticeListReorderOperation,
  type OfflineQueueEntry,
  type OfflineQueueOperation,
  type OfflineLearningAttemptOperation,
} from "@japangolearn/core";
import type { Database } from "@japangolearn/database";
import { captureException } from "@/lib/monitoring";
import { isOfflineError } from "@/lib/connectivity";
import { publicEnvironment } from "@/lib/environment";

export type LearningAttemptRequest = {
  activityType: string;
  attemptKey: string;
  answers: OfflineJson;
  practiceListId?: string;
  expectedUserId?: string;
};

export type PracticeListCreateRequest = {
  listId?: string;
  title: string;
  isSmartList?: boolean;
  sortOrder: number;
  expectedUserId?: string;
};

export type PracticeListItemRequest = {
  listId: string;
  itemType: OfflinePracticeListItemAddOperation["itemType"];
  itemId: number;
  expectedUserId?: string;
};

export type PracticeListReorderRequest = {
  changes: OfflinePracticeListReorderOperation["changes"];
  expectedUserId?: string;
};

export type PracticeListItemRemoveRequest = {
  listId: string;
  listItemId: string;
  itemType?: OfflinePracticeListItemRemoveOperation["itemType"];
  itemId?: number;
  expectedUserId?: string;
};

export type QueueDispatchResult =
  | { status: "submitted" }
  | { status: "queued" }
  | { status: "failed"; error: unknown };

export type CreatedPracticeList = {
  id: string;
  title: string;
  is_smart_list: boolean;
  sort_order: number;
};

export type CreatePracticeListResult = QueueDispatchResult & {
  data?: CreatedPracticeList;
};

export type DrainResult = {
  processed: number;
  remaining: number;
  status: "empty" | "complete" | "offline" | "deferred" | "failed" | "unauthenticated";
};

const MAX_ERROR_LENGTH = 240;
const MAX_RETRY_ATTEMPTS = 10;
const RETRY_BASE_DELAY_MS = 30_000;
const RETRY_MAX_DELAY_MS = 15 * 60_000;
const STORAGE_NAMESPACE = `${publicEnvironment.appEnv}:${publicEnvironment.supabaseUrl}`;

let storageTail: Promise<unknown> = Promise.resolve();
const clientDispatchTails = new WeakMap<object, Promise<QueueDispatchResult>>();
const dispatchTails = new Map<string, Promise<QueueDispatchResult>>();
const activeDrains = new Map<string, Promise<DrainResult>>();

function retryDelayMs(attempt: number): number {
  const exponent = Math.min(Math.max(attempt - 1, 0), 5);
  return Math.min(RETRY_MAX_DELAY_MS, RETRY_BASE_DELAY_MS * 2 ** exponent);
}

function withStorageLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageTail.then(operation, operation);
  storageTail = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Offline operation failed";
}

function toClientId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

type UserSessionSnapshot = { userId: string; accessToken: string };
type ReplayClientFactory = (accessToken: string) => SupabaseClient<Database>;

async function getSessionSnapshot(
  client: SupabaseClient<Database>
): Promise<UserSessionSnapshot | null> {
  try {
    const {
      data: { session },
    } = await client.auth.getSession();
    if (!session?.user.id || !session.access_token) return null;
    return { userId: session.user.id, accessToken: session.access_token };
  } catch (error) {
    captureException(error, { scope: "offline_queue", operation: "get_session" });
    return null;
  }
}

async function getUserId(client: SupabaseClient<Database>): Promise<string | null> {
  return (await getSessionSnapshot(client))?.userId ?? null;
}

function createBoundReplayClient(
  client: SupabaseClient<Database>,
  accessToken: string
): SupabaseClient<Database> {
  const factory = (
    client as SupabaseClient<Database> & { __offlineReplayClient?: ReplayClientFactory }
  ).__offlineReplayClient;
  if (factory) return factory(accessToken);
  return createClient<Database>(
    publicEnvironment.supabaseUrl,
    publicEnvironment.supabasePublicKey,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }
  );
}

async function readEntries(userId: string): Promise<OfflineQueueEntry[]> {
  const raw = await AsyncStorage.getItem(offlineQueueStorageKey(userId, STORAGE_NAMESPACE));
  return parseOfflineQueue(raw).filter((entry) => entry.userId === userId);
}

async function updateEntries(
  userId: string,
  update: (entries: OfflineQueueEntry[]) => OfflineQueueEntry[]
): Promise<OfflineQueueEntry[]> {
  return withStorageLock(async () => {
    const entries = await readEntries(userId);
    const next = update(entries);
    await AsyncStorage.setItem(
      offlineQueueStorageKey(userId, STORAGE_NAMESPACE),
      serializeOfflineQueue(next)
    );
    return next;
  });
}

async function enqueueOperation(
  userId: string,
  operation: OfflineQueueOperation
): Promise<QueueDispatchResult> {
  try {
    const entry = createOfflineQueueEntry(userId, operation);
    await updateEntries(userId, (entries) => appendOfflineQueueEntry(entries, entry));
    return { status: "queued" };
  } catch (error) {
    captureException(error, {
      scope: "offline_queue",
      operation: "enqueue",
      kind: operation.kind,
    });
    return { status: "failed", error };
  }
}

async function executeOperation(
  client: SupabaseClient<Database>,
  userId: string,
  operation: OfflineQueueOperation
): Promise<unknown | null> {
  switch (operation.kind) {
    case "learning_attempt": {
      const { error } = await client.rpc("submit_learning_attempt", {
        p_activity_type: operation.activityType,
        p_attempt_key: operation.idempotencyKey,
        p_answers: operation.answers,
        ...(operation.practiceListId ? { p_practice_list_id: operation.practiceListId } : {}),
      });
      return error;
    }
    case "practice_list_create": {
      const { error } = await client.from("practice_lists").upsert(
        {
          id: operation.listId,
          user_id: userId,
          title: operation.title,
          is_smart_list: operation.isSmartList,
          sort_order: operation.sortOrder,
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
      return error;
    }
    case "practice_list_delete": {
      const { error } = await client
        .from("practice_lists")
        .delete()
        .eq("id", operation.listId)
        .eq("user_id", userId);
      return error;
    }
    case "practice_list_item_add": {
      const { error } = await client.from("practice_list_items").upsert(
        {
          list_id: operation.listId,
          item_type: operation.itemType,
          item_id: operation.itemId,
        },
        { onConflict: "list_id,item_type,item_id", ignoreDuplicates: true }
      );
      return error;
    }
    case "practice_list_item_remove": {
      let query = client.from("practice_list_items").delete().eq("list_id", operation.listId);
      if (operation.itemType && operation.itemId !== undefined) {
        query = query.eq("item_type", operation.itemType).eq("item_id", operation.itemId);
      } else {
        query = query.eq("id", operation.listItemId);
      }
      const { error } = await query;
      return error;
    }
    case "practice_list_reorder": {
      const results = await Promise.all(
        operation.changes.map((change) =>
          client
            .from("practice_lists")
            .update({ sort_order: change.sortOrder })
            .eq("id", change.id)
            .eq("user_id", userId)
        )
      );
      return results.find((result) => result.error)?.error ?? null;
    }
  }
}

async function findQueuedOperation(
  userId: string,
  idempotencyKey: string
): Promise<OfflineQueueEntry | undefined> {
  const entries = await readEntries(userId);
  return entries.find((entry) => entry.operation.idempotencyKey === idempotencyKey);
}

async function dispatchOperationForUser(
  client: SupabaseClient<Database>,
  userId: string,
  operation: OfflineQueueOperation
): Promise<QueueDispatchResult> {
  const sameUser = async () => (await getUserId(client)) === userId;
  if (!(await sameUser())) {
    return { status: "failed", error: new Error("Authentication changed") };
  }

  // Persist before sending. If the process is killed after the request leaves
  // the device, the durable entry can be replayed with the same idempotency key.
  const enqueueResult = await enqueueOperation(userId, operation);
  if (enqueueResult.status === "failed") return enqueueResult;

  await drainOfflineQueue(client);
  if (!(await sameUser())) {
    return { status: "failed", error: new Error("Authentication changed") };
  }

  let queuedOperation: OfflineQueueEntry | undefined;
  try {
    queuedOperation = await findQueuedOperation(userId, operation.idempotencyKey);
  } catch (error) {
    // The entry was already durably written. Keep it queued if local storage
    // cannot be read immediately after the network attempt.
    captureException(error, { scope: "offline_queue", operation: "find_after_dispatch" });
    return { status: "queued" };
  }

  if (!queuedOperation) return { status: "submitted" };
  if (queuedOperation.deadLettered) {
    return {
      status: "failed",
      error: new Error(queuedOperation.lastError ?? "Offline operation was rejected"),
    };
  }
  return { status: "queued" };
}

async function dispatchOperationForClient(
  client: SupabaseClient<Database>,
  operation: OfflineQueueOperation,
  expectedUserId?: string
): Promise<QueueDispatchResult> {
  const userId = await getUserId(client);
  if (!userId) return { status: "failed", error: new Error("Not authenticated") };
  if (expectedUserId && expectedUserId !== userId) {
    return { status: "failed", error: new Error("Authentication changed") };
  }

  const previous =
    dispatchTails.get(userId) ??
    Promise.resolve<QueueDispatchResult>({
      status: "submitted",
    });
  const current = previous
    .catch(() => ({ status: "submitted" as const }))
    .then(() => dispatchOperationForUser(client, userId, operation))
    .catch((error) => ({ status: "failed" as const, error }));
  dispatchTails.set(userId, current);
  void current.then(
    () => {
      if (dispatchTails.get(userId) === current) dispatchTails.delete(userId);
    },
    () => {
      if (dispatchTails.get(userId) === current) dispatchTails.delete(userId);
    }
  );
  return current;
}

function dispatchOperation(
  client: SupabaseClient<Database>,
  operation: OfflineQueueOperation,
  expectedUserId?: string
): Promise<QueueDispatchResult> {
  const previous =
    clientDispatchTails.get(client) ??
    Promise.resolve<QueueDispatchResult>({
      status: "submitted",
    });
  const current = previous
    .catch(() => ({ status: "submitted" as const }))
    .then(() => dispatchOperationForClient(client, operation, expectedUserId))
    .catch((error) => ({ status: "failed" as const, error }));
  clientDispatchTails.set(client, current);
  void current.then(
    () => {
      if (clientDispatchTails.get(client) === current) clientDispatchTails.delete(client);
    },
    () => {
      if (clientDispatchTails.get(client) === current) clientDispatchTails.delete(client);
    }
  );
  return current;
}

export async function submitLearningAttemptWithQueue(
  client: SupabaseClient<Database>,
  request: LearningAttemptRequest
): Promise<QueueDispatchResult> {
  const operation: OfflineLearningAttemptOperation = {
    kind: "learning_attempt",
    idempotencyKey: request.attemptKey,
    activityType: request.activityType,
    answers: request.answers,
    ...(request.practiceListId ? { practiceListId: request.practiceListId } : {}),
  };
  return dispatchOperation(client, operation, request.expectedUserId);
}

export async function createPracticeListWithQueue(
  client: SupabaseClient<Database>,
  request: PracticeListCreateRequest
): Promise<CreatePracticeListResult> {
  const listId = request.listId ?? toClientId();
  const operation: OfflinePracticeListCreateOperation = {
    kind: "practice_list_create",
    idempotencyKey: `practice-list:create:${listId}`,
    listId,
    title: request.title,
    isSmartList: request.isSmartList ?? false,
    sortOrder: request.sortOrder,
  };
  const result = await dispatchOperation(client, operation, request.expectedUserId);
  if (result.status === "failed") return result;

  return {
    ...result,
    data: {
      id: listId,
      title: request.title,
      is_smart_list: operation.isSmartList,
      sort_order: request.sortOrder,
    },
  };
}

export function addPracticeListItemWithQueue(
  client: SupabaseClient<Database>,
  request: PracticeListItemRequest
): Promise<QueueDispatchResult> {
  const operation: OfflinePracticeListItemAddOperation = {
    kind: "practice_list_item_add",
    idempotencyKey: `practice-list-item:add:${request.listId}:${request.itemType}:${request.itemId}`,
    listId: request.listId,
    itemType: request.itemType,
    itemId: request.itemId,
  };
  return dispatchOperation(client, operation, request.expectedUserId);
}

export function removePracticeListItemWithQueue(
  client: SupabaseClient<Database>,
  request: PracticeListItemRemoveRequest
): Promise<QueueDispatchResult> {
  const operation: OfflinePracticeListItemRemoveOperation = {
    kind: "practice_list_item_remove",
    idempotencyKey: `practice-list-item:remove:${request.listId}:${request.listItemId}`,
    listId: request.listId,
    listItemId: request.listItemId,
    ...(request.itemType && request.itemId !== undefined
      ? { itemType: request.itemType, itemId: request.itemId }
      : {}),
  };
  return dispatchOperation(client, operation, request.expectedUserId);
}

export function deletePracticeListWithQueue(
  client: SupabaseClient<Database>,
  listId: string,
  expectedUserId?: string
): Promise<QueueDispatchResult> {
  const operation: OfflinePracticeListDeleteOperation = {
    kind: "practice_list_delete",
    idempotencyKey: `practice-list:delete:${listId}`,
    listId,
  };
  return dispatchOperation(client, operation, expectedUserId);
}

export function reorderPracticeListsWithQueue(
  client: SupabaseClient<Database>,
  request: PracticeListReorderRequest
): Promise<QueueDispatchResult> {
  const operation: OfflinePracticeListReorderOperation = {
    kind: "practice_list_reorder",
    idempotencyKey: `practice-list:reorder:${Date.now()}:${toClientId()}`,
    changes: request.changes,
  };
  return dispatchOperation(client, operation, request.expectedUserId);
}

async function drainQueue(client: SupabaseClient<Database>, userId: string): Promise<DrainResult> {
  let processed = 0;
  let hadPermanentFailure = false;
  const skippedEntryIds = new Set<string>();
  while (true) {
    let entries: OfflineQueueEntry[];
    try {
      entries = await readEntries(userId);
    } catch (error) {
      captureException(error, { scope: "offline_queue", operation: "read_for_sync" });
      return { processed, remaining: 0, status: "failed" };
    }

    const entry = entries.find(
      (candidate) => !skippedEntryIds.has(candidate.id) && candidate.deadLettered !== true
    );
    if (!entry) {
      return {
        processed,
        remaining: entries.length,
        status:
          hadPermanentFailure || entries.some((candidate) => candidate.deadLettered)
            ? "failed"
            : processed > 0
              ? "complete"
              : "empty",
      };
    }

    if (entry.nextAttemptAt !== undefined && entry.nextAttemptAt > Date.now()) {
      return { processed, remaining: entries.length, status: "deferred" };
    }

    const sessionSnapshot = await getSessionSnapshot(client);
    if (!sessionSnapshot || sessionSnapshot.userId !== userId) {
      return { processed, remaining: entries.length, status: "unauthenticated" };
    }

    let error: unknown | null;
    try {
      error = await executeOperation(
        createBoundReplayClient(client, sessionSnapshot.accessToken),
        userId,
        entry.operation
      );
    } catch (caught) {
      error = caught;
    }

    if (error) {
      const retryable = isOfflineError(error);
      const nextAttemptNumber = entry.attempts + 1;
      const deadLettered = !retryable || nextAttemptNumber >= MAX_RETRY_ATTEMPTS;
      try {
        await updateEntries(userId, (current) =>
          markOfflineQueueEntryFailed(
            current,
            entry.id,
            errorMessage(error).slice(0, MAX_ERROR_LENGTH),
            deadLettered
              ? { deadLettered: true }
              : { retryAt: Date.now() + retryDelayMs(nextAttemptNumber) }
          )
        );
      } catch (storageError) {
        captureException(storageError, { scope: "offline_queue", operation: "record_failure" });
      }
      captureException(error, {
        scope: "offline_queue",
        operation: "replay",
        kind: entry.operation.kind,
        attempts: nextAttemptNumber,
      });
      if (retryable && !deadLettered) {
        return { processed, remaining: entries.length, status: "offline" };
      }
      hadPermanentFailure = true;
      skippedEntryIds.add(entry.id);
      continue;
    }

    if ((await getUserId(client)) !== userId) {
      return { processed, remaining: entries.length, status: "unauthenticated" };
    }

    try {
      await updateEntries(userId, (current) => removeOfflineQueueEntry(current, entry.id));
    } catch (storageError) {
      captureException(storageError, { scope: "offline_queue", operation: "acknowledge" });
      return { processed, remaining: entries.length, status: "failed" };
    }
    processed += 1;
  }
}

export function drainOfflineQueue(client: SupabaseClient<Database>): Promise<DrainResult> {
  return getUserId(client).then((userId) => {
    if (!userId) return { processed: 0, remaining: 0, status: "unauthenticated" as const };

    const existing = activeDrains.get(userId);
    if (existing) return existing;

    let current: Promise<DrainResult>;
    current = drainQueue(client, userId).finally(() => {
      if (activeDrains.get(userId) === current) activeDrains.delete(userId);
    });
    activeDrains.set(userId, current);
    return current;
  });
}

export async function getOfflineQueueSize(client: SupabaseClient<Database>): Promise<number> {
  const userId = await getUserId(client);
  if (!userId) return 0;
  try {
    return (await readEntries(userId)).length;
  } catch (error) {
    captureException(error, { scope: "offline_queue", operation: "count" });
    return 0;
  }
}

export async function getOfflineQueueEntries(
  client: SupabaseClient<Database>
): Promise<OfflineQueueEntry[]> {
  const userId = await getUserId(client);
  if (!userId) return [];
  try {
    return await readEntries(userId);
  } catch (error) {
    captureException(error, { scope: "offline_queue", operation: "entries" });
    return [];
  }
}

export async function getOfflineQueueFailures(
  client: SupabaseClient<Database>
): Promise<OfflineQueueEntry[]> {
  const userId = await getUserId(client);
  if (!userId) return [];
  try {
    return (await readEntries(userId)).filter((entry) => entry.deadLettered === true);
  } catch (error) {
    captureException(error, { scope: "offline_queue", operation: "failures" });
    return [];
  }
}

export async function discardOfflineQueueEntry(
  client: SupabaseClient<Database>,
  entryId: string
): Promise<boolean> {
  const userId = await getUserId(client);
  if (!userId) return false;
  try {
    await updateEntries(userId, (entries) => removeOfflineQueueEntry(entries, entryId));
    return true;
  } catch (error) {
    captureException(error, { scope: "offline_queue", operation: "discard" });
    return false;
  }
}
