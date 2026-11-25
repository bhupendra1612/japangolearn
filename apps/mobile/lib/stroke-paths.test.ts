import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("@/lib/offline-cache", () => ({ readCache: mocks.read, writeCache: mocks.write }));
const svg = (path: string) => new Response(`<svg><path d="${path}"/></svg>`);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.read.mockResolvedValue(null);
  mocks.write.mockResolvedValue(undefined);
});
afterEach(() => vi.unstubAllGlobals());

describe("stroke data for kana review", () => {
  it("loads and positions both glyphs of a combination in writing order", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(svg("M0,0L20,20"))
      .mockResolvedValueOnce(svg("M2,2L10,10"));
    vi.stubGlobal("fetch", fetch);
    const { fetchStrokePaths } = await import("./stroke-paths");
    const paths = await fetchStrokePaths("きゃ");
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      expect.stringContaining("0304d.svg"),
      expect.stringContaining("03083.svg"),
    ]);
    expect(paths).toHaveLength(2);
    expect(paths?.map((path) => path.d)).toEqual(["M0,0L20,20", "M2,2L10,10"]);
    expect(paths?.map((path) => path.transform)).toEqual([
      "translate(0 27.25) scale(0.5)",
      "translate(54.5 27.25) scale(0.5)",
    ]);
    await fetchStrokePaths("きゃ");
    expect(fetch).toHaveBeenCalledTimes(2); // Replay uses the already loaded paths.
  });

  it("never presents a partial combination as a complete animation", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(svg("M0,0L20,20"))
        .mockResolvedValueOnce(new Response("", { status: 404 }))
    );
    const { fetchStrokePaths } = await import("./stroke-paths");
    expect(await fetchStrokePaths("キャ")).toBeNull();
  });

  it("allows replay to retry a temporary server failure", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(svg("M0,0L20,20"));
    vi.stubGlobal("fetch", fetch);
    const { fetchStrokePaths } = await import("./stroke-paths");
    await expect(fetchStrokePaths("あ")).rejects.toThrow("503");
    expect(await fetchStrokePaths("あ")).toHaveLength(1);
  });

  it("keeps saved animation available when the server is unavailable", async () => {
    const saved = [{ d: "M0,0L20,20", length: 29 }];
    mocks.read.mockResolvedValue({ data: saved, savedAt: 1 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 503 })));
    const { fetchStrokePaths } = await import("./stroke-paths");
    expect(await fetchStrokePaths("あ")).toEqual(saved);
  });
});
