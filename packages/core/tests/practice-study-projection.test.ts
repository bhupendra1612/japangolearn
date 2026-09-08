import { describe, expect, it } from "vitest";
import { applyPendingStudyRemovals } from "../src/practice-study-projection";

describe("pending practice-study projections", () => {
  it("scopes removals to the list that owns them", () => {
    const items = [{ listItemId: "pending:kana:7", itemId: "7" }];
    const removals = [{ listId: "list-a", listItemId: "pending:kana:7" }];

    expect(applyPendingStudyRemovals(items, "list-a", removals)).toEqual([]);
    expect(applyPendingStudyRemovals(items, "list-b", removals)).toEqual(items);
  });
});
