import { describe, expect, it } from "vitest";
import { reorderPracticeLists } from "../src";

describe("practice-list ordering", () => {
  it("compares persisted positions with the original order before renumbering", () => {
    const lists = [
      { id: "list-a", title: "A", sort_order: 1 },
      { id: "list-b", title: "B", sort_order: 2 },
      { id: "list-c", title: "C", sort_order: 3 },
    ];

    const result = reorderPracticeLists(lists, 0, 1);

    expect(result.ordered.map((list) => [list.id, list.sort_order])).toEqual([
      ["list-b", 1],
      ["list-a", 2],
      ["list-c", 3],
    ]);
    expect(result.changes).toEqual([
      { id: "list-b", sortOrder: 1 },
      { id: "list-a", sortOrder: 2 },
    ]);
  });

  it("does not produce changes for an invalid boundary move", () => {
    const lists = [
      { id: "list-a", title: "A", sort_order: 1 },
      { id: "list-b", title: "B", sort_order: 2 },
    ];

    const result = reorderPracticeLists(lists, 0, -1);

    expect(result.ordered).toEqual(lists);
    expect(result.changes).toEqual([]);
  });
});
