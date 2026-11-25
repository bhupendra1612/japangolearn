import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), page: vi.fn(), range: vi.fn() }));
vi.mock("./offline-cache", () => ({ readCache: mocks.read, writeCache: mocks.write }));
vi.mock("./monitoring", () => ({ captureException: vi.fn() }));
vi.mock("@/constants/jlpt", () => ({ CONTENT_JLPT_LEVEL: "N5" }));
vi.mock("./supabase", () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ order: () => ({ range: mocks.range }) }) }) }),
  },
}));
const row = {
  id: 1,
  kanji: "学校",
  hiragana: "がっこう",
  romaji: "gakkou",
  romaji_hindi: null,
  english: "School",
  topic: "School & Study",
  jlpt_level: "N5",
  icon: null,
};
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.read.mockResolvedValue(null);
  mocks.write.mockResolvedValue(undefined);
  mocks.range.mockImplementation(() => ({ abortSignal: mocks.page }));
});
describe("vocabulary loading", () => {
  it("loads all pages before replacing cached data", async () => {
    mocks.page
      .mockResolvedValueOnce({
        data: Array.from({ length: 500 }, (_, i) => ({ ...row, id: i + 1 })),
        error: null,
      })
      .mockResolvedValueOnce({ data: [{ ...row, id: 501 }], error: null });
    const { loadVocabulary } = await import("./vocabulary-loader");
    const publish = vi.fn();
    await loadVocabulary(publish, new AbortController().signal);
    expect(mocks.range.mock.calls).toEqual([
      [0, 499],
      [500, 999],
    ]);
    expect(publish.mock.lastCall?.[0].data).toHaveLength(501);
  });
  it("shows saved content immediately and retains it after network failure", async () => {
    let fail!: (value: unknown) => void;
    mocks.read.mockResolvedValue({ data: [row], savedAt: 1 });
    mocks.page.mockImplementation(
      () =>
        new Promise((resolve) => {
          fail = resolve;
        })
    );
    const { loadVocabulary } = await import("./vocabulary-loader");
    const publish = vi.fn();
    const request = loadVocabulary(publish, new AbortController().signal);
    await Promise.resolve();
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({ data: [row], refreshing: true })
    );
    fail({ data: null, error: new Error("offline") });
    await request;
    expect(publish.mock.lastCall?.[0]).toMatchObject({ data: [row], refreshing: false });
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("does not publish a partial refresh when a later page fails", async () => {
    mocks.read.mockResolvedValue({ data: [row], savedAt: 1 });
    mocks.page
      .mockResolvedValueOnce({
        data: Array.from({ length: 500 }, (_, i) => ({ ...row, id: i + 1 })),
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: new Error("timeout") });
    const { loadVocabulary } = await import("./vocabulary-loader");
    const publish = vi.fn();
    await loadVocabulary(publish, new AbortController().signal);
    expect(publish.mock.lastCall?.[0].data).toEqual([row]);
    expect(mocks.write).not.toHaveBeenCalled();
  });
});
