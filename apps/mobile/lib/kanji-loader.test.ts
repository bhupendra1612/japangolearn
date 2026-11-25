import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
  request: vi.fn(),
  range: vi.fn(),
  level: vi.fn(),
  report: vi.fn(),
}));
vi.mock("./offline-cache", () => ({ readCache: mocks.read, writeCache: mocks.write }));
vi.mock("./monitoring", () => ({ captureException: mocks.report }));
vi.mock("./environment", () => ({ publicEnvironment: { supabaseUrl: "http://localhost" } }));
vi.mock("./supabase", () => ({
  supabase: { from: () => ({ select: () => ({ eq: mocks.level }) }) },
}));
const row = { id: 1, character: "日", meaning_en: ["Sun"], jlpt_level: "N5" };
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.read.mockResolvedValue(null);
  mocks.write.mockResolvedValue(undefined);
  mocks.level.mockImplementation(() => ({
    order: () => ({ order: () => ({ range: mocks.range }) }),
  }));
  mocks.range.mockImplementation(() => ({ abortSignal: mocks.request }));
});
describe("kanji library loading", () => {
  it("renders cached lessons before a slow refresh, then replaces them", async () => {
    let resolve!: (value: unknown) => void;
    mocks.read.mockResolvedValue({ data: [row], savedAt: 1 });
    mocks.request.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    const { loadKanji } = await import("./kanji-loader");
    const publish = vi.fn();
    const pending = loadKanji(publish, new AbortController().signal);
    await vi.waitFor(() => expect(publish.mock.lastCall?.[0].data).toHaveLength(1));
    expect(publish.mock.lastCall?.[0].refreshing).toBe(true);
    resolve({ data: [row, { ...row, id: 2, character: "月" }], error: null });
    await pending;
    expect(publish.mock.lastCall?.[0].data).toHaveLength(2);
    expect(publish.mock.lastCall?.[0].refreshing).toBe(false);
  });
  it("loads every N5 page and only caches a complete collection", async () => {
    mocks.request
      .mockResolvedValueOnce({
        data: Array.from({ length: 500 }, (_, i) => ({ ...row, id: i + 1 })),
        error: null,
      })
      .mockResolvedValueOnce({ data: [{ ...row, id: 501 }], error: null });
    const { loadKanji } = await import("./kanji-loader");
    const publish = vi.fn();
    await loadKanji(publish, new AbortController().signal);
    expect(mocks.level).toHaveBeenCalledWith("jlpt_level", "N5");
    expect(mocks.range.mock.calls).toEqual([
      [0, 499],
      [500, 999],
    ]);
    expect(publish.mock.lastCall?.[0].data).toHaveLength(501);
    expect(mocks.write).toHaveBeenCalledTimes(1);
  });
  it("keeps saved content when the network or remote content fails", async () => {
    mocks.read.mockResolvedValue({ data: [row], savedAt: 1 });
    mocks.request.mockResolvedValue({ data: [null], error: null });
    const { loadKanji } = await import("./kanji-loader");
    const publish = vi.fn();
    await loadKanji(publish, new AbortController().signal);
    expect(publish.mock.lastCall?.[0]).toMatchObject({
      error: true,
      refreshing: false,
      savedAt: 1,
    });
    expect(publish.mock.lastCall?.[0].data[0].character).toBe("日");
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.report).toHaveBeenCalledTimes(1);
  });
  it("keeps cached content during normal offline use without reporting a crash", async () => {
    mocks.read.mockResolvedValue({ data: [row], savedAt: 1 });
    mocks.request.mockResolvedValue({
      data: null,
      error: { message: "TypeError: Failed to fetch" },
    });
    const { loadKanji } = await import("./kanji-loader");
    const publish = vi.fn();
    await loadKanji(publish, new AbortController().signal);
    expect(publish.mock.lastCall?.[0]).toMatchObject({
      error: true,
      refreshing: false,
      savedAt: 1,
    });
    expect(publish.mock.lastCall?.[0].data[0].character).toBe("日");
    expect(mocks.report).not.toHaveBeenCalled();
  });
  it("does not publish a stale request after navigation cancels it", async () => {
    const controller = new AbortController();
    mocks.request.mockImplementation(async () => {
      controller.abort();
      return { data: [row], error: null };
    });
    const { loadKanji } = await import("./kanji-loader");
    const publish = vi.fn();
    await loadKanji(publish, controller.signal);
    expect(publish).toHaveBeenCalledTimes(1);
    expect(mocks.write).not.toHaveBeenCalled();
  });
});
