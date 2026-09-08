import { describe, expect, it, vi } from "vitest";
import { resolveNeedsPracticeList } from "./needs-practice";

describe("resolveNeedsPracticeList", () => {
  it("reuses the cached list when lookup fails offline", async () => {
    const createList = vi.fn(async () => "new-list");

    const result = await resolveNeedsPracticeList(
      { error: new Error("Network request failed") },
      "cached-list",
      createList
    );

    expect(result).toEqual({ id: "cached-list", created: false });
    expect(createList).not.toHaveBeenCalled();
  });

  it("does not create a random list when offline without a cache", async () => {
    const createList = vi.fn(async () => "new-list");

    const result = await resolveNeedsPracticeList(
      { error: new Error("Network request failed") },
      null,
      createList
    );

    expect(result).toEqual({ id: null, created: false });
    expect(createList).not.toHaveBeenCalled();
  });

  it("creates a list only when the lookup explicitly reports no rows", async () => {
    const createList = vi.fn(async () => "new-list");

    const result = await resolveNeedsPracticeList(
      { error: { code: "PGRST116", message: "No rows found" } },
      null,
      createList
    );

    expect(result).toEqual({ id: "new-list", created: true });
    expect(createList).toHaveBeenCalledTimes(1);
  });
});
