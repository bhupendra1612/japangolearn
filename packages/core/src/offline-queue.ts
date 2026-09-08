import { MASTERY_ITEM_TYPES, type MasteryItemType } from "./learning";

export type OfflineJson =
  | null
  | boolean
  | number
  | string
  | OfflineJson[]
  | { [key: string]: OfflineJson };

export type OfflineLearningAttemptOperation = {
  kind: "learning_attempt";
  idempotencyKey: string;
  activityType: string;
  answers: OfflineJson;
  practiceListId?: string;
};

export type OfflinePracticeListCreateOperation = {
  kind: "practice_list_create";
  idempotencyKey: string;
  listId: string;
  title: string;
  isSmartList: boolean;
  sortOrder: number;
};

export type OfflinePracticeListDeleteOperation = {
  kind: "practice_list_delete";
  idempotencyKey: string;
  listId: string;
};

export type OfflinePracticeListItemAddOperation = {
  kind: "practice_list_item_add";
  idempotencyKey: string;
  listId: string;
  itemType: MasteryItemType;
  itemId: number;
};

export type OfflinePracticeListItemRemoveOperation = {
  kind: "practice_list_item_remove";
  idempotencyKey: string;
  listId: string;
  listItemId: string;
  itemType?: MasteryItemType;
  itemId?: number;
};

export type OfflinePracticeListReorderOperation = {
  kind: "practice_list_reorder";
  idempotencyKey: string;
  changes: { id: string; sortOrder: number }[];
};

export type OfflineQueueOperation =
  | OfflineLearningAttemptOperation
  | OfflinePracticeListCreateOperation
  | OfflinePracticeListDeleteOperation
  | OfflinePracticeListItemAddOperation
  | OfflinePracticeListItemRemoveOperation
  | OfflinePracticeListReorderOperation;

export type OfflineQueueEntry = {
  id: string;
  userId: string;
  queuedAt: number;
  attempts: number;
  lastError?: string;
  nextAttemptAt?: number;
  deadLettered?: boolean;
  operation: OfflineQueueOperation;
};

export type OfflineQueueFailureOptions = {
  retryAt?: number;
  deadLettered?: boolean;
};

export const OFFLINE_QUEUE_VERSION = 1;

export function offlineQueueStorageKey(userId: string, environment = "default"): string {
  return `offline-queue:v${OFFLINE_QUEUE_VERSION}:${encodeURIComponent(environment)}:${encodeURIComponent(userId)}`;
}

export function createOfflineQueueEntry(
  userId: string,
  operation: OfflineQueueOperation,
  queuedAt = Date.now()
): OfflineQueueEntry {
  return {
    id: operation.idempotencyKey,
    userId,
    queuedAt,
    attempts: 0,
    operation,
  };
}

export function appendOfflineQueueEntry(
  entries: readonly OfflineQueueEntry[],
  entry: OfflineQueueEntry
): OfflineQueueEntry[] {
  if (
    entry.operation.kind === "practice_list_item_add" ||
    entry.operation.kind === "practice_list_item_remove"
  ) {
    const target = entry.operation as
      | Extract<OfflineQueueOperation, { kind: "practice_list_item_add" }>
      | Extract<OfflineQueueOperation, { kind: "practice_list_item_remove" }>;
    const sameItem = (candidate: OfflineQueueEntry) => {
      const operation = candidate.operation;
      if (
        (operation.kind !== "practice_list_item_add" &&
          operation.kind !== "practice_list_item_remove") ||
        operation.listId !== target.listId
      ) {
        return false;
      }
      if (operation.kind === "practice_list_item_add" && target.kind === "practice_list_item_add") {
        return operation.itemType === target.itemType && operation.itemId === target.itemId;
      }
      if (
        operation.kind === "practice_list_item_remove" &&
        target.kind === "practice_list_item_remove"
      ) {
        if (operation.itemType && target.itemType) {
          return operation.itemType === target.itemType && operation.itemId === target.itemId;
        }
        return operation.listItemId === target.listItemId;
      }
      const add = operation.kind === "practice_list_item_add" ? operation : target;
      const remove = operation.kind === "practice_list_item_remove" ? operation : target;
      return (
        Boolean(remove.itemType) && remove.itemType === add.itemType && remove.itemId === add.itemId
      );
    };

    const activeAddAlreadyQueued =
      entry.operation.kind === "practice_list_item_add" &&
      entries.some(
        (candidate) =>
          candidate.operation.kind === "practice_list_item_add" &&
          !candidate.deadLettered &&
          sameItem(candidate)
      );
    if (activeAddAlreadyQueued) {
      return entries.filter(
        (candidate) =>
          !(candidate.operation.kind === "practice_list_item_remove" && sameItem(candidate))
      );
    }

    const compacted = entries.filter((candidate) => !sameItem(candidate));
    return [...compacted, entry];
  }

  if (
    entries.some(
      (existing) =>
        existing.userId === entry.userId &&
        existing.operation.idempotencyKey === entry.operation.idempotencyKey
    )
  ) {
    return [...entries];
  }
  return [...entries, entry];
}

export function removeOfflineQueueEntry(
  entries: readonly OfflineQueueEntry[],
  entryId: string
): OfflineQueueEntry[] {
  return entries.filter((entry) => entry.id !== entryId);
}

export function markOfflineQueueEntryFailed(
  entries: readonly OfflineQueueEntry[],
  entryId: string,
  errorMessage: string,
  options: OfflineQueueFailureOptions = {}
): OfflineQueueEntry[] {
  return entries.map((entry) =>
    entry.id === entryId
      ? {
          ...entry,
          attempts: entry.attempts + 1,
          lastError: errorMessage.slice(0, 240),
          ...(options.retryAt === undefined ? {} : { nextAttemptAt: options.retryAt }),
          ...(options.deadLettered === undefined ? {} : { deadLettered: options.deadLettered }),
        }
      : entry
  );
}

export function serializeOfflineQueue(entries: readonly OfflineQueueEntry[]): string {
  return JSON.stringify(entries);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOfflineJson(value: unknown): value is OfflineJson {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isOfflineJson);
  if (!isRecord(value)) return false;
  return Object.values(value).every(isOfflineJson);
}

function isOfflineQueueOperation(value: unknown): value is OfflineQueueOperation {
  if (!isRecord(value) || typeof value.kind !== "string") return false;
  if (typeof value.idempotencyKey !== "string") return false;

  switch (value.kind) {
    case "learning_attempt":
      return (
        typeof value.activityType === "string" &&
        isOfflineJson(value.answers) &&
        (value.practiceListId === undefined || typeof value.practiceListId === "string")
      );
    case "practice_list_create":
      return (
        typeof value.listId === "string" &&
        typeof value.title === "string" &&
        typeof value.isSmartList === "boolean" &&
        typeof value.sortOrder === "number" &&
        Number.isInteger(value.sortOrder)
      );
    case "practice_list_delete":
      return typeof value.listId === "string";
    case "practice_list_item_add":
      return (
        typeof value.listId === "string" &&
        typeof value.itemType === "string" &&
        MASTERY_ITEM_TYPES.includes(value.itemType as MasteryItemType) &&
        typeof value.itemId === "number" &&
        Number.isInteger(value.itemId)
      );
    case "practice_list_item_remove":
      return (
        typeof value.listId === "string" &&
        typeof value.listItemId === "string" &&
        ((value.itemType === undefined && value.itemId === undefined) ||
          (typeof value.itemType === "string" &&
            MASTERY_ITEM_TYPES.includes(value.itemType as MasteryItemType) &&
            typeof value.itemId === "number" &&
            Number.isInteger(value.itemId)))
      );
    case "practice_list_reorder":
      return (
        Array.isArray(value.changes) &&
        value.changes.every(
          (change) =>
            isRecord(change) &&
            typeof change.id === "string" &&
            typeof change.sortOrder === "number" &&
            Number.isInteger(change.sortOrder)
        )
      );
    default:
      return false;
  }
}

function isOfflineQueueEntry(value: unknown): value is OfflineQueueEntry {
  if (!isRecord(value)) return false;
  const operation = value.operation;
  return (
    typeof value.id === "string" &&
    isRecord(operation) &&
    value.id === operation.idempotencyKey &&
    typeof value.userId === "string" &&
    typeof value.queuedAt === "number" &&
    typeof value.attempts === "number" &&
    (value.lastError === undefined || typeof value.lastError === "string") &&
    (value.nextAttemptAt === undefined || typeof value.nextAttemptAt === "number") &&
    (value.deadLettered === undefined || typeof value.deadLettered === "boolean") &&
    isOfflineQueueOperation(operation)
  );
}

export function parseOfflineQueue(raw: string | null): OfflineQueueEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isOfflineQueueEntry) : [];
  } catch {
    return [];
  }
}
