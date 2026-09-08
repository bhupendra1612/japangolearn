export type PendingStudyRemoval = {
  listId: string;
  listItemId: string;
};

export function applyPendingStudyRemovals<T extends { listItemId: string }>(
  items: readonly T[],
  listId: string,
  removals: readonly PendingStudyRemoval[]
): T[] {
  const removedIds = new Set(
    removals.filter((removal) => removal.listId === listId).map((removal) => removal.listItemId)
  );
  return items.filter((item) => !removedIds.has(item.listItemId));
}
