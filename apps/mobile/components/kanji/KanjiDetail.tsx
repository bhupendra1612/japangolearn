import { useCallback, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import type { Kanji } from "@japangolearn/database";
import { createVocabularySpeechPlayer, type VocabularyPlayback } from "@/lib/vocabulary-speech";
import { kanjiPronunciation } from "@/lib/kanji-study";
import { useAuth } from "@/lib/auth";
import StrokeWriter from "@/components/StrokeWriter";
import { AddToListModal } from "@/components/AddToListModal";
import { AuthPromptModal } from "@/components/AuthPromptModal";
import { Action, ColorIcon, IconButton, K, topicStyle, u } from "./kanji-ui";

export function KanjiDetail(props: {
  item: Kanji;
  all: Kanji[];
  saved: boolean;
  familiar: boolean;
  ready: boolean;
  showHindi: boolean;
  onSave: () => void;
  onFamiliar: () => void;
  onClose: () => void;
  onSelect: (item: Kanji) => void;
}) {
  const { item, all, saved, familiar, ready, showHindi, onSave, onFamiliar, onClose, onSelect } =
    props;
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [tab, setTab] = useState<"readings" | "words" | "examples">("readings");
  const [replay, setReplay] = useState(0);
  const [addList, setAddList] = useState(false);
  const [authPrompt, setAuthPrompt] = useState(false);
  const [playback, setPlayback] = useState<VocabularyPlayback>({
    wordId: null,
    mode: null,
    error: false,
  });
  const [player] = useState(() => createVocabularySpeechPlayer(Speech, setPlayback));
  useFocusEffect(useCallback(() => () => player.stop(), [player]));
  const speak = (text: string, slow = false) =>
    void player.speak(item.id, text, slow ? "slow" : "normal");
  const close = () => {
    player.stop();
    onClose();
  };
  const select = (next: Kanji) => {
    player.stop();
    onSelect(next);
  };
  const index = all.findIndex((k) => k.id === item.id);
  const theme = topicStyle(item.tags[0]);

  const related = (characters: string[], confusing = false) => {
    if (!characters.length) return null;
    return (
      <View style={u.panel}>
        <View style={u.row}>
          <ColorIcon
            name={confusing ? "eye" : "git-branch"}
            color={confusing ? K.amber : K.blue}
            size={32}
          />
          <Text style={u.sectionTitle}>{confusing ? "Look closely" : "Connected characters"}</Text>
        </View>
        <Text style={u.muted}>
          {confusing
            ? "Similar shapes, different meanings. Compare them side by side in your memory."
            : "Make another connection to help this character stick."}
        </Text>
        <View style={s.wrap}>
          {characters.map((character) => {
            const match = all.find((k) => k.character === character);
            return (
              <TouchableOpacity
                key={character}
                disabled={!match}
                accessibilityRole="button"
                accessibilityLabel={
                  match
                    ? `Explore ${character}, ${match.meaning_en.join(", ")}`
                    : `${character}, outside this library`
                }
                accessibilityState={{ disabled: !match }}
                onPress={() => match && select(match)}
                style={[s.related, !match && { opacity: 0.55 }]}
              >
                <Text style={{ color: confusing ? K.amber : K.blue, fontSize: 30 }}>
                  {character}
                </Text>
                <Text style={s.tiny}>{match?.meaning_en[0] ?? "Not in N5"}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={close}>
      <View
        style={[u.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        accessibilityViewIsModal
      >
        <View style={s.top}>
          <IconButton name="arrow-back" label="Close kanji details" onPress={close} />
          <View style={{ flex: 1 }}>
            <Text style={u.eyebrow}>KANJI EXPLORER</Text>
            <Text style={s.topTitle}>
              {index >= 0 ? `${index + 1} of ${all.length}` : item.jlpt_level}
            </Text>
          </View>
          <IconButton
            name={saved ? "bookmark" : "bookmark-outline"}
            color={K.amber}
            selected={saved}
            disabled={!ready}
            label={saved ? `Unsave ${item.character}` : `Save ${item.character}`}
            onPress={onSave}
          />
        </View>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={["#2F2852", "#1B2037"]} style={s.hero}>
            <View style={u.between}>
              <View style={u.row}>
                <ColorIcon name={theme.icon} color={theme.color} size={32} />
                <Text style={[u.pillText, { color: theme.color }]}>{theme.label}</Text>
              </View>
              <View style={u.pill}>
                <Text style={u.pillText}>{item.jlpt_level}</Text>
              </View>
            </View>
            <View style={s.strokeTile}>
              <View style={s.gridH} />
              <View style={s.gridV} />
              <StrokeWriter
                key={replay}
                character={item.character}
                size={154}
                color="#ECE4FF"
                outlineColor="#716789"
                showUnavailableMessage
              />
            </View>
            <TouchableOpacity
              onPress={() => setReplay((v) => v + 1)}
              accessibilityRole="button"
              accessibilityLabel="Replay stroke order"
              style={[u.row, { alignSelf: "center", minHeight: 44 }]}
            >
              <Ionicons name="refresh" color={K.purple} size={17} />
              <Text style={[u.pillText, { fontSize: 13 }]}>Replay strokes</Text>
            </TouchableOpacity>
            <Text style={s.meaning}>{item.meaning_en.join(" · ")}</Text>
            {showHindi && !!item.meaning_hi.length && (
              <Text style={s.hindi}>{item.meaning_hi.join(" · ")}</Text>
            )}
            <Text style={s.reading}>
              {item.hiragana}
              {item.romaji ? `  /  ${item.romaji}` : ""}
            </Text>
            <View style={[u.row, { justifyContent: "center", flexWrap: "wrap" }]}>
              <View style={u.row}>
                <Ionicons name="brush" color={K.pink} size={15} />
                <Text style={u.muted}>{item.stroke_count} strokes</Text>
              </View>
              {!!item.radical && (
                <View style={u.row}>
                  <Ionicons name="layers" color={K.blue} size={15} />
                  <Text style={u.muted}>Radical {item.radical}</Text>
                </View>
              )}
            </View>
            <View style={u.row}>
              <View style={{ flex: 1 }}>
                <Action
                  label={playback.mode === "normal" ? "Playing…" : "Listen"}
                  icon="volume-high"
                  onPress={() => speak(kanjiPronunciation(item))}
                  color={K.green}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Action
                  label={playback.mode === "slow" ? "Playing…" : "Slow"}
                  icon="speedometer-outline"
                  onPress={() => speak(kanjiPronunciation(item), true)}
                  color={K.blue}
                />
              </View>
            </View>
            {playback.error && (
              <Text accessibilityRole="alert" style={[u.muted, { color: K.amber }]}>
                Audio couldn’t play. Check that a Japanese voice is installed on your device.
              </Text>
            )}
          </LinearGradient>

          <View style={s.tabs}>
            {(["readings", "words", "examples"] as const).map((value, i) => (
              <TouchableOpacity
                key={value}
                accessibilityRole="tab"
                accessibilityLabel={
                  value === "words"
                    ? `Words (${item.vocabulary.length})`
                    : value === "examples"
                      ? "Examples"
                      : "Readings"
                }
                accessibilityState={{ selected: tab === value }}
                onPress={() => setTab(value)}
                style={[s.tab, tab === value && s.activeTab]}
              >
                <Ionicons
                  name={(["language", "book", "chatbubble-ellipses"] as const)[i]}
                  size={17}
                  color={tab === value ? K.purple : K.muted}
                />
                <Text style={[s.tabText, tab === value && { color: K.text }]}>
                  {value === "words"
                    ? `Words (${item.vocabulary.length})`
                    : value === "examples"
                      ? "Examples"
                      : "Readings"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {tab === "readings" && (
            <>
              {(
                [
                  {
                    title: "Kun’yomi",
                    subtitle: "Japanese reading · often used in standalone words",
                    rows: item.kunyomi,
                    color: K.green,
                    icon: "leaf",
                  },
                  {
                    title: "On’yomi",
                    subtitle: "Chinese-origin reading · often used in compounds",
                    rows: item.onyomi,
                    color: K.purple,
                    icon: "library",
                  },
                ] as const
              ).map((group) => (
                <View key={group.title} style={u.panel}>
                  <View style={u.row}>
                    <ColorIcon name={group.icon} color={group.color} />
                    <View style={{ flex: 1 }}>
                      <Text style={u.sectionTitle}>{group.title}</Text>
                      <Text style={[u.muted, { fontSize: 11 }]}>{group.subtitle}</Text>
                    </View>
                  </View>
                  {!group.rows.length && (
                    <Text style={u.muted}>No reading listed for this character.</Text>
                  )}
                  {group.rows.map((reading, i) => (
                    <View style={u.between} key={`${reading.reading}:${i}`}>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.kana, { color: group.color }]}>{reading.reading}</Text>
                        <Text style={u.muted}>
                          {reading.romaji}
                          {showHindi && reading.hindi ? ` · ${reading.hindi}` : ""}
                        </Text>
                      </View>
                      <IconButton
                        name="volume-medium"
                        color={group.color}
                        label={`Listen to ${reading.reading}`}
                        onPress={() => speak(reading.reading.replace(/[.・]/g, ""))}
                      />
                    </View>
                  ))}
                </View>
              ))}
              {!!item.mnemonic && (
                <View
                  style={[u.panel, { borderColor: K.amber + "45", backgroundColor: "#292535" }]}
                >
                  <View style={u.row}>
                    <ColorIcon name="bulb" color={K.amber} />
                    <Text style={u.sectionTitle}>Make it memorable</Text>
                  </View>
                  <Text style={u.text}>{item.mnemonic}</Text>
                </View>
              )}
              {!!item.writing_tip && (
                <View style={u.panel}>
                  <View style={u.row}>
                    <ColorIcon name="brush" color={K.pink} />
                    <Text style={u.sectionTitle}>Writing tip</Text>
                  </View>
                  <Text style={u.text}>{item.writing_tip}</Text>
                </View>
              )}
              {related(item.related_kanji)}
              {related(item.confusable_kanji, true)}
            </>
          )}
          {tab === "words" && (
            <>
              {!item.vocabulary.length && (
                <Text style={u.muted}>No vocabulary examples have been added yet.</Text>
              )}
              {item.vocabulary.map((word, i) => (
                <View key={`${word.word}:${i}`} style={u.panel}>
                  <View style={u.between}>
                    <Text style={[s.kana, { flex: 1 }]}>{word.word}</Text>
                    <IconButton
                      name="volume-high"
                      label={`Listen to ${word.word}`}
                      color={K.green}
                      onPress={() => speak(word.hiragana || word.word)}
                    />
                  </View>
                  <Text style={[u.text, { color: K.purple }]}>{word.hiragana}</Text>
                  <Text style={u.muted}>
                    {word.romaji}
                    {showHindi && word.hindi_pronunciation ? ` · ${word.hindi_pronunciation}` : ""}
                  </Text>
                  <Text style={u.text}>{word.english}</Text>
                  {showHindi && !!word.hindi && (
                    <Text style={[u.muted, { color: K.amber }]}>{word.hindi}</Text>
                  )}
                </View>
              ))}
            </>
          )}
          {tab === "examples" && (
            <>
              {!item.example_sentences.length && (
                <Text style={u.muted}>No example sentences have been added yet.</Text>
              )}
              {item.example_sentences.map((example, i) => (
                <View key={i} style={u.panel}>
                  <View style={u.between}>
                    <Text style={[s.kana, { flex: 1, fontSize: 21 }]}>{example.jp}</Text>
                    <IconButton
                      name="volume-high"
                      label={`Listen to example ${i + 1}`}
                      color={K.blue}
                      onPress={() => speak(example.jp)}
                    />
                  </View>
                  <Text style={[u.text, { color: K.purple }]}>{example.hiragana}</Text>
                  <Text style={u.muted}>{example.romaji}</Text>
                  <Text style={u.text}>{example.english}</Text>
                  {showHindi && !!example.hindi_pronunciation && (
                    <Text style={u.muted}>{example.hindi_pronunciation}</Text>
                  )}
                  {showHindi && !!example.hindi && (
                    <Text style={[u.muted, { color: K.amber }]}>{example.hindi}</Text>
                  )}
                </View>
              ))}
            </>
          )}
          <Action
            label={familiar ? "Familiar · tap to reset" : "Mark as familiar"}
            icon={familiar ? "checkmark-circle" : "checkmark-circle-outline"}
            color={K.green}
            onPress={onFamiliar}
            disabled={!ready}
          />
          <Text style={[s.tiny, { textAlign: "center" }]}>
            Your self-assessment is saved on this device.
          </Text>
          <Action
            label="Add to a practice list"
            icon="add-circle"
            onPress={() => {
              player.stop();
              if (session) setAddList(true);
              else setAuthPrompt(true);
            }}
          />
          <View style={u.between}>
            <Action
              label="Previous"
              icon="arrow-back"
              disabled={index <= 0}
              onPress={() => all[index - 1] && select(all[index - 1])}
            />
            <Action
              label="Next kanji"
              icon="arrow-forward"
              disabled={index < 0 || index === all.length - 1}
              onPress={() => all[index + 1] && select(all[index + 1])}
            />
          </View>
        </ScrollView>
        <AddToListModal
          visible={addList}
          onClose={() => setAddList(false)}
          itemType="kanji"
          itemId={item.id}
          itemTitle={item.character}
          studyItem={{
            listItemId: `pending:kanji:${item.id}`,
            itemType: "kanji",
            itemId: String(item.id),
            front: item.character,
            back: item.meaning_en.join(", "),
            correctAnswer: item.meaning_en.join(", "),
            audioText: kanjiPronunciation(item),
            reading: item.hiragana,
            romaji: item.romaji,
            english: item.meaning_en.join(", "),
            meaningHindi: item.meaning_hi.join(", "),
            masteryScore: 0,
            lastReviewed: null,
          }}
        />
        <AuthPromptModal
          visible={authPrompt}
          onClose={() => setAuthPrompt(false)}
          feature="practice lists"
          redirectTo="/(tabs)/kanji"
        />
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  top: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  topTitle: { color: K.muted, fontSize: 12, marginTop: 4 },
  content: {
    padding: 20,
    gap: 16,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
    paddingBottom: 28,
  },
  hero: { padding: 20, borderRadius: 26, gap: 12, borderWidth: 1, borderColor: "#464060" },
  strokeTile: {
    width: 170,
    height: 170,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#655C7F",
    backgroundColor: "#19192E",
    overflow: "hidden",
  },
  gridH: {
    position: "absolute",
    top: "50%",
    width: "100%",
    borderTopWidth: 1,
    borderColor: "#35324D",
    borderStyle: "dashed",
  },
  gridV: {
    position: "absolute",
    left: "50%",
    height: "100%",
    borderLeftWidth: 1,
    borderColor: "#35324D",
    borderStyle: "dashed",
  },
  meaning: { color: K.text, fontSize: 25, lineHeight: 33, fontWeight: "800", textAlign: "center" },
  hindi: { fontSize: 18, lineHeight: 26, color: K.amber, textAlign: "center" },
  reading: { fontSize: 14, color: K.muted, textAlign: "center", lineHeight: 22 },
  tabs: { flexDirection: "row", backgroundColor: K.card, borderRadius: 15, padding: 4 },
  tab: { flex: 1, gap: 5, alignItems: "center", paddingVertical: 12, borderRadius: 12 },
  activeTab: { backgroundColor: "#36304F" },
  tabText: { color: K.muted, fontSize: 12, fontWeight: "700" },
  kana: { color: K.text, fontSize: 24, lineHeight: 34, fontWeight: "600" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  related: {
    backgroundColor: K.bg,
    minWidth: 70,
    maxWidth: 140,
    padding: 12,
    borderRadius: 14,
    alignItems: "center",
    gap: 4,
  },
  tiny: { color: K.muted, fontSize: 11, lineHeight: 17 },
});
