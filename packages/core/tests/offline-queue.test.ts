import { describe, expect, it } from "vitest";
import {
  appendOfflineQueueEntry,
  createOfflineQueueEntry,
  markOfflineQueueEntryFailed,
  parseOfflineQueue,
  removeOfflineQueueEntry,
  serializeOfflineQueue,
  type OfflineQueueOperation,
} from "../src/offline-queue";

const operation: OfflineQueueOperation = {
  kind: "learning_attempt",
  idempotencyKey: "attempt-1",
  activityType: "practice_quiz",
  answers: [],
};

describe("offline queue contract", () => {
  it("deduplicates an operation by its idempotency key", () => {
    const entry = createOfflineQueueEntry("user-1", operation, 123);

    expect(appendOfflineQueueEntry([], entry)).toEqual([entry]);
    expect(appendOfflineQueueEntry([entry], entry)).toEqual([entry]);
  });

  it("removes only the acknowledged entry", () => {
    const first = createOfflineQueueEntry("user-1", operation, 123);
    const second = createOfflineQueueEntry("user-1", {
      ...operation,
      idempotencyKey: "attempt-2",
    });

    expect(removeOfflineQueueEntry([first, second], first.id)).toEqual([second]);
  });

  it("round-trips queue entries and records retry metadata", () => {
    const entry = createOfflineQueueEntry("user-1", operation, 123);
    const parsed = parseOfflineQueue(serializeOfflineQueue([entry]));

    expect(parsed).toEqual([entry]);
    expect(markOfflineQueueEntryFailed(parsed, entry.id, "temporarily unavailable")).toEqual([
      { ...entry, attempts: 1, lastError: "temporarily unavailable" },
    ]);
    expect(parseOfflineQueue("not json")).toEqual([]);
    expect(
      parseOfflineQueue(
        JSON.stringify([
          {
            ...entry,
            operation: { ...operation, kind: "unknown" },
          },
        ])
      )
    ).toEqual([]);
  });

  it("keeps the last offline list-item intent", () => {
    const add = createOfflineQueueEntry("user-1", {
      kind: "practice_list_item_add",
      idempotencyKey: "add-1",
      listId: "list-1",
      itemType: "kana",
      itemId: 7,
    });
    const remove = createOfflineQueueEntry("user-1", {
      kind: "practice_list_item_remove",
      idempotencyKey: "remove-1",
      listId: "list-1",
      listItemId: "pending:kana:7",
      itemType: "kana",
      itemId: 7,
    });
    const readd = createOfflineQueueEntry("user-1", {
      kind: "practice_list_item_add",
      idempotencyKey: "add-2",
      listId: "list-1",
      itemType: "kana",
      itemId: 7,
    });

    expect(appendOfflineQueueEntry([add], remove)).toEqual([remove]);
    expect(appendOfflineQueueEntry([remove], readd)).toEqual([readd]);
  });
});
