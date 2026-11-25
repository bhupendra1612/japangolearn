import { useCallback, useRef, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import type { Kanji } from "@japangolearn/database";
import { createVocabularySpeechPlayer, type VocabularyPlayback } from "@/lib/vocabulary-speech";
import { kanjiPronunciation } from "@/lib/kanji-study";
import { Action, ColorIcon, IconButton, K, u } from "./kanji-ui";

export function KanjiReview({
  items,
  showHindi,
  onRate,
  onClose,
}: {
  items: Kanji[];
  showHindi: boolean;
  onRate: (id: number, familiar: boolean) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const answered = useRef(false);
  const [known, setKnown] = useState(0);
  const [missed, setMissed] = useState<Kanji[]>([]);
  const [round, setRound] = useState(items);
  const [playback, setPlayback] = useState<VocabularyPlayback>({
    wordId: null,
    mode: null,
    error: false,
  });
  const [player] = useState(() => createVocabularySpeechPlayer(Speech, setPlayback));
  useFocusEffect(useCallback(() => () => player.stop(), [player]));
  const item = round[index];
  const rate = (familiar: boolean) => {
    if (!item || !revealed || answered.current) return;
    answered.current = true;
    player.stop();
    onRate(item.id, familiar);
    if (familiar) setKnown((v) => v + 1);
    else setMissed((v) => [...v, item]);
    setRevealed(false);
    setIndex((v) => v + 1);
  };
  const close = () => {
    player.stop();
    onClose();
  };
  return (
    <Modal visible animationType="slide" onRequestClose={close}>
      <View
        style={[u.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        accessibilityViewIsModal
      >
        <View style={s.top}>
          <ColorIcon name="flash" color={K.amber} />
          <View style={{ flex: 1 }}>
            <Text style={u.sectionTitle}>Quick recall</Text>
            <Text style={u.muted}>A moment to make it stick</Text>
          </View>
          <IconButton name="close" label="Close quick recall" onPress={close} />
        </View>
        <ScrollView contentContainerStyle={s.content}>
          {item ? (
            <>
              <View style={u.between}>
                <Text style={u.eyebrow}>
                  CHARACTER {index + 1} OF {round.length}
                </Text>
                <Text style={u.muted}>Self-check</Text>
              </View>
              <View style={s.track}>
                <View style={[s.fill, { width: `${(index / round.length) * 100}%` }]} />
              </View>
              <LinearGradient colors={["#332A50", "#1A2137"]} style={s.card}>
                <Text style={u.pillText}>{item.jlpt_level}</Text>
                <Text style={s.character}>{item.character}</Text>
                {revealed ? (
                  <View style={s.answer}>
                    <Text style={s.meaning}>{item.meaning_en.join(" · ")}</Text>
                    <Text style={[u.text, { color: K.purple, textAlign: "center" }]}>
                      {item.hiragana}
                      {item.romaji ? ` · ${item.romaji}` : ""}
                    </Text>
                    {showHindi && !!item.meaning_hi.length && (
                      <Text style={[u.text, { color: K.amber, textAlign: "center" }]}>
                        {item.meaning_hi.join(" · ")}
                      </Text>
                    )}
                    <Action
                      label="Hear the reading"
                      icon="volume-high"
                      onPress={() => void player.speak(item.id, kanjiPronunciation(item), "normal")}
                      color={K.green}
                    />
                    {!!item.mnemonic && (
                      <Text style={[u.muted, { textAlign: "center" }]}>{item.mnemonic}</Text>
                    )}
                  </View>
                ) : (
                  <Text style={[u.muted, { textAlign: "center" }]}>
                    Can you recall the meaning{`\n`}and one reading?
                  </Text>
                )}
              </LinearGradient>
              {playback.error && (
                <Text style={[u.muted, { color: K.amber }]}>
                  Audio is unavailable. Check your device’s Japanese voice.
                </Text>
              )}
              {revealed ? (
                <View style={u.row}>
                  <View style={{ flex: 1 }}>
                    <Action
                      label="Still learning"
                      icon="refresh"
                      color={K.amber}
                      onPress={() => rate(false)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Action
                      label="Got it"
                      icon="checkmark-circle"
                      primary
                      color={K.green}
                      onPress={() => rate(true)}
                    />
                  </View>
                </View>
              ) : (
                <Action
                  label="Reveal answer"
                  icon="eye"
                  primary
                  onPress={() => {
                    answered.current = false;
                    setRevealed(true);
                  }}
                />
              )}
              <Text style={[u.muted, { textAlign: "center", fontSize: 11 }]}>
                An honest self-check builds a stronger memory.{`\n`}Familiarity is saved on this
                device. No XP is awarded.
              </Text>
            </>
          ) : (
            <View style={s.complete}>
              <ColorIcon name="sparkles" color={K.amber} size={76} />
              <Text style={u.title}>A little more familiar.</Text>
              <Text style={[u.text, { textAlign: "center", color: K.muted }]}>
                {known} of {round.length} characters felt familiar.{`\n`}
                {missed.length
                  ? "Give the tricky ones another look."
                  : "Great work making time for your kanji."}
              </Text>
              {!!missed.length && (
                <Action
                  label={`Review ${missed.length} tricky kanji`}
                  icon="refresh"
                  primary
                  onPress={() => {
                    setRound(missed);
                    setMissed([]);
                    setKnown(0);
                    setIndex(0);
                    setRevealed(false);
                  }}
                />
              )}
              <Action label="Back to library" icon="grid" onPress={close} />
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 12, padding: 18 },
  content: { padding: 20, gap: 22, maxWidth: 620, width: "100%", alignSelf: "center", flexGrow: 1 },
  track: { height: 5, backgroundColor: K.border, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: K.green },
  card: {
    padding: 26,
    gap: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#494262",
    borderRadius: 28,
    minHeight: 350,
  },
  character: { color: K.text, fontSize: 106, lineHeight: 140 },
  answer: { gap: 16, width: "100%" },
  meaning: { color: K.text, fontSize: 27, lineHeight: 35, textAlign: "center", fontWeight: "700" },
  complete: { alignItems: "center", gap: 24, paddingTop: 50 },
});
