export type PracticeListOrderItem = {
  id: string;
  sort_order?: number;
};

export type PracticeListOrderChange = {
  id: string;
  sortOrder: number;
};

export type PracticeListOrderResult<T extends PracticeListOrderItem> = {
  ordered: T[];
  changes: PracticeListOrderChange[];
};

/**
 * Move one list and calculate persistence changes from the pre-move order.
 * The returned rows are renumbered to the 1-based order stored in the database.
 */
export function reorderPracticeLists<T extends PracticeListOrderItem>(
  lists: readonly T[],
  index: number,
  direction: -1 | 1
): PracticeListOrderResult<T> {
  const target = index + direction;
  if (index < 0 || index >= lists.length || target < 0 || target >= lists.length) {
    return { ordered: [...lists], changes: [] };
  }

  const originalOrder = new Map(lists.map((list) => [list.id, list.sort_order]));
  const swapped = [...lists];
  [swapped[index], swapped[target]] = [swapped[target], swapped[index]];

  const ordered = swapped.map((list, position) => ({
    ...list,
    sort_order: position + 1,
  })) as T[];

  const changes = ordered.flatMap((list, position) => {
    const sortOrder = position + 1;
    return originalOrder.get(list.id) === sortOrder ? [] : [{ id: list.id, sortOrder }];
  });

  return { ordered, changes };
}
