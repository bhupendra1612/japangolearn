import type { SpeechOptions, Voice } from "expo-speech";

export type VocabularySpeechMode = "normal" | "slow";
export type VocabularyPlayback = {
  wordId: number | null;
  mode: VocabularySpeechMode | null;
  error: boolean;
};
type SpeechDriver = {
  stop: () => Promise<void>;
  speak: (text: string, options: SpeechOptions) => void;
  getAvailableVoicesAsync?: () => Promise<Voice[]>;
};

/** One fresh utterance per tap. A newer tap owns all subsequent callbacks. */
export function createVocabularySpeechPlayer(
  driver: SpeechDriver,
  onChange: (state: VocabularyPlayback) => void
) {
  let request = 0;
  let voice: Promise<string | undefined> | undefined;
  const japaneseVoice = () => {
    if (!driver.getAvailableVoicesAsync) return Promise.resolve(undefined);
    // Keep both speeds on the same Japanese voice, preferring an installed one.
    // Bound discovery because browsers may never emit voiceschanged.
    if (!voice)
      voice = new Promise<string | undefined>((resolve) => {
        const timeout = setTimeout(() => resolve(undefined), 1200);
        void driver.getAvailableVoicesAsync!()
          .then((voices) => {
            const japanese = voices.filter((entry) => /^ja(?:[-_]|$)/i.test(entry.language));
            const local = japanese.find(
              (entry) => (entry as Voice & { localService?: boolean }).localService
            );
            resolve((local ?? japanese[0])?.identifier);
          })
          .catch(() => resolve(undefined))
          .finally(() => clearTimeout(timeout));
      });
    return voice;
  };
  const idle: VocabularyPlayback = { wordId: null, mode: null, error: false };
  return {
    stop() {
      request++;
      onChange(idle);
      void driver.stop().catch(() => {});
    },
    async speak(wordId: number, reading: string, mode: VocabularySpeechMode) {
      const token = ++request;
      onChange(idle);
      const update = (state: VocabularyPlayback) => {
        if (token === request) onChange(state);
      };
      try {
        await driver.stop();
        const voiceId = await japaneseVoice();
        if (token !== request) return;
        update({ wordId, mode, error: false });
        driver.speak(reading, {
          language: "ja-JP",
          ...(voiceId ? { voice: voiceId } : {}),
          // Expo normalizes rate to 1.0 on Android, iOS and web.
          // A larger contrast is easier to hear for short vocabulary words.
          rate: mode === "slow" ? 0.3 : 1,
          pitch: 1,
          onDone: () => update(idle),
          onStopped: () => update(idle),
          onError: () => update({ ...idle, error: true }),
        });
      } catch {
        update({ ...idle, error: true });
      }
    },
  };
}
