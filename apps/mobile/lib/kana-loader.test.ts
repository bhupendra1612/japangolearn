import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Kana } from "@japangolearn/database";
import type { KanaLoadResult } from "./kana-loader";

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
  request: vi.fn(),
  report: vi.fn(),
}));
vi.mock("./offline-cache", () => ({ readCache: mocks.read, writeCache: mocks.write }));
vi.mock("./monitoring", () => ({ captureException: mocks.report }));
vi.mock("./supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ order: () => ({ abortSignal: mocks.request }) }) }),
    }),
  },
}));

const row: Kana = {
  id: 1,
  character: "あ",
  romaji: "a",
  romaji_hindi: "अ",
  type: "hiragana",
  group_name: "Vowels (あ行)",
  stroke_count: 3,
  stroke_hint: "",
  sort_order: 1,
  is_combo: false,
  is_dakuten: false,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.read.mockResolvedValue(null);
  mocks.write.mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

describe("kana loading", () => {
  it("renders saved characters before a slow network finishes, then refreshes them", async () => {
    const { loadKana } = await import("./kana-loader");
    const network = deferred<{ data: Kana[]; error: null }>();
    mocks.read.mockResolvedValue({ data: [row], savedAt: 100 });
    mocks.request.mockReturnValue(network.promise);
    const results: KanaLoadResult[] = [];
    const pending = loadKana(
      "hiragana",
      (result) => results.push(result),
      new AbortController().signal
    );
    await Promise.resolve();
    expect(results[0]).toMatchObject({ data: [{ character: "あ" }], refreshing: true });
    network.resolve({ data: [{ ...row, romaji_hindi: "आ" }], error: null });
    await pending;
    expect(results.at(-1)).toMatchObject({
      data: [{ romaji_hindi: "आ" }],
      refreshing: false,
      error: null,
    });
    expect(mocks.write).toHaveBeenCalledOnce();
  });

  it("does not let a late disk read overwrite a fresh response", async () => {
    const { loadKana, getRememberedKana } = await import("./kana-loader");
    const disk = deferred<{ data: Kana[]; savedAt: number }>();
    mocks.read.mockReturnValue(disk.promise);
    mocks.request.mockResolvedValue({ data: [{ ...row, romaji_hindi: "आ" }], error: null });
    const results: KanaLoadResult[] = [];
    await loadKana("hiragana", (result) => results.push(result), new AbortController().signal);
    disk.resolve({ data: [row], savedAt: 1 });
    await Promise.resolve();
    expect(results).toHaveLength(1);
    expect(getRememberedKana("hiragana")?.data[0].romaji_hindi).toBe("आ");
  });

  it("ignores a canceled request when the learner changes scripts", async () => {
    const { loadKana, getRememberedKana } = await import("./kana-loader");
    const network = deferred<{ data: Kana[]; error: null }>();
    mocks.request.mockReturnValue(network.promise);
    const controller = new AbortController();
    const publish = vi.fn();
    const pending = loadKana("hiragana", publish, controller.signal);
    controller.abort();
    network.resolve({ data: [row], error: null });
    await pending;
    expect(publish).not.toHaveBeenCalled();
    expect(getRememberedKana("hiragana")).toBeUndefined();
  });

  it("keeps cached content usable offline and remembers it for the next visit", async () => {
    const { loadKana, getRememberedKana } = await import("./kana-loader");
    mocks.read.mockResolvedValue({ data: [row], savedAt: 100 });
    mocks.request.mockResolvedValue({ data: null, error: new Error("Network request failed") });
    const results: KanaLoadResult[] = [];
    await loadKana("hiragana", (result) => results.push(result), new AbortController().signal);
    expect(results.at(-1)).toMatchObject({ data: [{ id: 1 }], refreshing: false, savedAt: 100 });
    expect(results.at(-1)?.error).toBeInstanceOf(Error);
    expect(getRememberedKana("hiragana")?.data).toHaveLength(1);
  });

  it("rejects cached content from the wrong script", async () => {
    const { loadKana } = await import("./kana-loader");
    mocks.read.mockResolvedValue({ data: [{ ...row, type: "katakana" }], savedAt: 100 });
    mocks.request.mockResolvedValue({ data: null, error: new Error("Network request failed") });
    const results: KanaLoadResult[] = [];
    await loadKana("hiragana", (result) => results.push(result), new AbortController().signal);
    expect(results).toHaveLength(1);
    expect(results[0].data).toEqual([]);
  });

  it("bounds network waiting and releases the loading state", async () => {
    vi.useFakeTimers();
    const { loadKana } = await import("./kana-loader");
    mocks.request.mockImplementation(
      (signal: AbortSignal) =>
        new Promise((resolve) => {
          signal.addEventListener("abort", () =>
            resolve({ data: null, error: new Error("Request timed out") })
          );
        })
    );
    const publish = vi.fn();
    const pending = loadKana("hiragana", publish, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(8_000);
    await pending;
    expect(publish).toHaveBeenLastCalledWith(
      expect.objectContaining({ refreshing: false, data: [] })
    );
  });
});
