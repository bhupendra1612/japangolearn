import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import * as Speech from "expo-speech";
import type { VocabularyWord } from "@japangolearn/database";
import { primaryReading } from "./vocabulary-study";
import { createVocabularySpeechPlayer, type VocabularyPlayback } from "./vocabulary-speech";

export function useVocabularySpeech() {
  const [playback, setPlayback] = useState<VocabularyPlayback>({
    wordId: null,
    mode: null,
    error: false,
  });
  const [player] = useState(() => createVocabularySpeechPlayer(Speech, setPlayback));
  const stop = useCallback(() => player.stop(), [player]);
  useFocusEffect(useCallback(() => stop, [stop]));
  const speak = useCallback(
    (word: VocabularyWord, slow = false) =>
      player.speak(word.id, primaryReading(word), slow ? "slow" : "normal"),
    [player]
  );
  return {
    speak,
    stop,
    speaking: playback.wordId,
    speechMode: playback.mode,
    audioError: playback.error,
  };
}
