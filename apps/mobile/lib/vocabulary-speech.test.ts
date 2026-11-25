import { describe, expect, it, vi } from "vitest";
import type { SpeechOptions, Voice } from "expo-speech";
import { createVocabularySpeechPlayer } from "./vocabulary-speech";

function setup() {
  const driver = {
    stop: vi.fn(async () => {}),
    speak: vi.fn<(text: string, options: SpeechOptions) => void>(),
  };
  const changed = vi.fn();
  return { driver, changed, player: createVocabularySpeechPlayer(driver, changed) };
}
const done = (options: SpeechOptions) => (options.onDone as () => void)?.();
const stopped = (options: SpeechOptions) => (options.onStopped as () => void)?.();
const failed = (options: SpeechOptions) =>
  (options.onError as (error: Error) => void)?.(new Error("voice unavailable"));

describe("vocabulary audio playback", () => {
  it("uses the same installed Japanese voice for both speeds", async () => {
    const { driver, changed } = setup();
    const voices = vi.fn(async () =>
      [
        { identifier: "english", language: "en-US", localService: true },
        { identifier: "remote-japanese", language: "ja-JP", localService: false },
        { identifier: "installed-japanese", language: "ja-JP", localService: true },
      ].map((voice) => ({
        ...voice,
        name: voice.identifier,
        quality: "Default" as Voice["quality"],
      }))
    );
    const player = createVocabularySpeechPlayer(
      { ...driver, getAvailableVoicesAsync: voices },
      changed
    );
    await player.speak(1, "じしょ", "normal");
    await player.speak(1, "じしょ", "slow");
    expect(driver.speak.mock.calls.map(([, options]) => options.voice)).toEqual([
      "installed-japanese",
      "installed-japanese",
    ]);
    expect(voices).toHaveBeenCalledTimes(1);
  });

  it("uses the language fallback when voice discovery fails", async () => {
    const { driver, changed } = setup();
    const player = createVocabularySpeechPlayer(
      {
        ...driver,
        getAvailableVoicesAsync: async () => {
          throw new Error("unavailable");
        },
      },
      changed
    );
    await player.speak(1, "じしょ", "slow");
    expect(driver.speak.mock.calls[0][1]).toMatchObject({ language: "ja-JP" });
    expect(driver.speak.mock.calls[0][1].voice).toBeUndefined();
  });

  it("does not hang if a browser never finishes discovering voices", async () => {
    vi.useFakeTimers();
    try {
      const { driver, changed } = setup();
      const player = createVocabularySpeechPlayer(
        { ...driver, getAvailableVoicesAsync: () => new Promise(() => {}) },
        changed
      );
      const pending = player.speak(1, "じしょ", "slow");
      await vi.advanceTimersByTimeAsync(1200);
      await pending;
      expect(driver.speak).toHaveBeenCalledTimes(1);
      expect(driver.speak.mock.calls[0][1].language).toBe("ja-JP");
    } finally {
      vi.useRealTimers();
    }
  });

  it("restarts the same full reading with a substantially slower rate and unchanged pitch", async () => {
    const { player, driver, changed } = setup();
    await player.speak(1, "じしょ", "normal");
    await player.speak(1, "じしょ", "slow");
    const [normal, slow] = driver.speak.mock.calls;
    expect(normal[0]).toBe("じしょ");
    expect(slow[0]).toBe(normal[0]);
    expect(normal[1].rate).toBe(1);
    expect(slow[1].rate).toBeLessThan(normal[1].rate! / 2);
    expect(slow[1].pitch).toBe(normal[1].pitch);
    expect(slow[1].language).toBe("ja-JP");
    expect(driver.stop).toHaveBeenCalledTimes(2);
    expect(changed).toHaveBeenLastCalledWith({ wordId: 1, mode: "slow", error: false });
  });

  it("ignores old callbacks when Slow is replayed repeatedly", async () => {
    const { player, driver, changed } = setup();
    await player.speak(1, "ありがとう", "slow");
    const first = driver.speak.mock.calls[0][1];
    await player.speak(1, "ありがとう", "slow");
    stopped(first);
    done(first);
    failed(first);
    expect(changed).toHaveBeenLastCalledWith({ wordId: 1, mode: "slow", error: false });
    done(driver.speak.mock.calls[1][1]);
    expect(changed).toHaveBeenLastCalledWith({ wordId: null, mode: null, error: false });
  });

  it("only speaks the latest selection when cancellation finishes out of order", async () => {
    const { player, driver } = setup();
    let finishFirst!: () => void;
    let finishSecond!: () => void;
    driver.stop.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishFirst = resolve;
        })
    );
    driver.stop.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishSecond = resolve;
        })
    );
    const normal = player.speak(1, "あいさつ", "normal");
    const slow = player.speak(1, "あいさつ", "slow");
    finishSecond();
    await slow;
    finishFirst();
    await normal;
    expect(driver.speak).toHaveBeenCalledTimes(1);
    expect(driver.speak.mock.calls[0][1].rate).toBeLessThan(0.5);
  });

  it("does not start queued audio after leaving a word", async () => {
    const { player, driver, changed } = setup();
    let finish!: () => void;
    driver.stop.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const pending = player.speak(1, "あいさつ", "slow");
    player.stop();
    finish();
    await pending;
    expect(driver.speak).not.toHaveBeenCalled();
    expect(changed).toHaveBeenLastCalledWith({ wordId: null, mode: null, error: false });
  });

  it("reports active playback errors and permits a fresh normal replay", async () => {
    const { player, driver, changed } = setup();
    await player.speak(1, "あいさつ", "slow");
    failed(driver.speak.mock.calls[0][1]);
    expect(changed).toHaveBeenLastCalledWith({ wordId: null, mode: null, error: true });
    await player.speak(1, "あいさつ", "normal");
    expect(changed).toHaveBeenLastCalledWith({ wordId: 1, mode: "normal", error: false });
    expect(driver.speak.mock.calls[1][1].rate).toBe(1);
  });
});
