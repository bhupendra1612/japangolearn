import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/lib/auth";
import { useAndroidBack } from "@/lib/use-android-back";
import { useVocabularySpeech } from "@/lib/use-vocabulary-speech";
import { loadVocabulary, rememberedVocabulary, type VocabularyLoad } from "@/lib/vocabulary-loader";
import {
  prepareVocabulary,
  primaryReading,
  searchVocabulary,
  writtenWord,
  type StudyWord,
} from "@/lib/vocabulary-study";
import { readCache, writeCache } from "@/lib/offline-cache";
import { isOfflineError } from "@/lib/connectivity";
import { AddToListModal } from "@/components/AddToListModal";
import { AuthPromptModal } from "@/components/AuthPromptModal";
import { LoadError } from "@/components/LoadError";
import StrokeWriter from "@/components/StrokeWriter";
import VocabularyPractice from "@/components/VocabularyPractice";

const TOPIC_ICONS: Record<string, string> = {
  Verbs: "🏃",
  "i-Adjectives": "✨",
  "na-Adjectives": "💫",
  Adverbs: "⚡",
  Numbers: "🔢",
  Colors: "🎨",
  Family: "👨‍👩‍👧",
  "Food & Drink": "🍜",
  "Daily Life": "🌅",
  Time: "⏰",
  "Animals & Birds": "🐾",
  "Nature & Weather": "🌸",
  "Places & Buildings": "🏯",
  "School & Study": "🎓",
  "Body Parts": "👤",
  Clothing: "👘",
  "House & Rooms": "🏠",
  "Greetings & Expressions": "🙏",
  "Question Words": "❓",
  "Pronouns & People": "👥",
  "Fruits & Vegetables": "🍎",
  Vehicles: "🚗",
  Directions: "🧭",
  "Position Words": "📍",
  Counters: "🔡",
  Conjunctions: "🔗",
  Seasons: "🌸",
  Months: "📅",
  "Week Days": "📆",
};
const wordIcon = (word: StudyWord) => word.icon || TOPIC_ICONS[word.topic] || "📌";
const TOPIC_COLORS: Record<string, string> = {
  "Daily Life": "#F2C991",
  "Position Words": "#98C6F5",
  Verbs: "#8BD8C6",
  "i-Adjectives": "#D5AEF0",
  "na-Adjectives": "#C8B5EE",
  Colors: "#E6B1CC",
  "Food & Drink": "#F0C38B",
  "Fruits & Vegetables": "#AED69D",
  Family: "#E8B1C4",
  "Pronouns & People": "#E0B9DA",
  "School & Study": "#96CBE0",
  Numbers: "#ACBEF3",
  "Nature & Weather": "#9EDCCB",
  "Animals & Birds": "#B8D8A3",
  Time: "#E9C88A",
};
const topicColor = (topic: string) => TOPIC_COLORS[topic] ?? "#C2B8EB";

function VocabIconButton({
  name,
  label,
  onPress,
  active = false,
  disabled = false,
  color,
  testID,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  color?: string;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        s.iconButton,
        active && {
          backgroundColor: `${color ?? "#B9A5FA"}20`,
          borderColor: `${color ?? "#B9A5FA"}70`,
        },
        disabled && { opacity: 0.35 },
      ]}
    >
      <Ionicons name={name} size={20} color={color ?? (active ? "#D8CCFF" : "#B8C7DF")} />
    </TouchableOpacity>
  );
}
function VocabControl({
  label,
  icon,
  active,
  onPress,
  testID,
  glyph,
  color = "#C5B4FF",
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  active: boolean;
  onPress: () => void;
  testID?: string;
  glyph?: string;
  color?: string;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[s.control, active && { backgroundColor: `${color}20`, borderColor: `${color}85` }]}
    >
      {glyph ? (
        <Text accessible={false} style={[s.controlGlyph, { color }]}>
          {glyph}
        </Text>
      ) : (
        <Ionicons name={icon} size={21} color={color} />
      )}
    </TouchableOpacity>
  );
}

export default function VocabularyScreen() {
  const { session } = useAuth();
  return (
    <VocabularyStudy key={session?.user.id ?? "guest"} storageOwner={session?.user.id ?? "guest"} />
  );
}

function VocabularyStudy({ storageOwner }: { storageOwner: string }) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { speak, stop, speaking, speechMode, audioError } = useVocabularySpeech();
  const params = useLocalSearchParams<{
    focusItemId?: string;
    focusNonce?: string;
    fromListId?: string;
  }>();
  const consumedFocus = useRef<string | null>(null);
  const fromList = useRef(false);
  const [content, setContent] = useState<VocabularyLoad>(() => ({
    data: rememberedVocabulary()?.data ?? [],
    savedAt: rememberedVocabulary()?.savedAt ?? 0,
    refreshing: true,
    error: null,
  }));
  const controller = useRef<AbortController | null>(null);
  const [mode, setMode] = useState<"browse" | "detail" | "quiz">("browse");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [topic, setTopic] = useState("All");
  const [savedOnly, setSavedOnly] = useState(false);
  const [showRomaji, setShowRomaji] = useState(false);
  const [showHindi, setShowHindi] = useState(false);
  const [hideMeanings, setHideMeanings] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const savedRef = useRef<Set<string>>(new Set());
  const [savedReady, setSavedReady] = useState(false);
  const [topicSheet, setTopicSheet] = useState(false);
  const [topicQuery, setTopicQuery] = useState("");
  const [about, setAbout] = useState(false);
  const [detail, setDetail] = useState<{ pool: StudyWord[]; index: number } | null>(null);
  const [strokeOpen, setStrokeOpen] = useState(false);
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [replay, setReplay] = useState(0);
  const [addList, setAddList] = useState(false);
  const [listAuth, setListAuth] = useState(false);
  const [quizSelection, setQuizSelection] = useState<{ words: StudyWord[]; label: string } | null>(
    null
  );
  const listRef = useRef<FlatList<StudyWord>>(null);
  const detailScroll = useRef<ScrollView>(null);
  const bookmarkKey = `vocabulary-bookmarks:${storageOwner}`;

  const refresh = useCallback(() => {
    controller.current?.abort();
    controller.current = new AbortController();
    void loadVocabulary(setContent, controller.current.signal);
  }, []);
  useEffect(() => {
    refresh();
    return () => controller.current?.abort();
  }, [refresh]);
  useEffect(() => {
    let active = true;
    void readCache<string[]>(bookmarkKey).then((value) => {
      if (!active) return;
      const valid = Array.isArray(value?.data)
        ? value.data.filter((item) => typeof item === "string")
        : [];
      savedRef.current = new Set(valid);
      setSaved(savedRef.current);
      setSavedReady(true);
    });
    return () => {
      active = false;
    };
  }, [bookmarkKey]);
  const words = useMemo(() => prepareVocabulary(content.data), [content.data]);
  const topics = useMemo(() => [...new Set(words.flatMap((w) => w.topics))].sort(), [words]);
  const topicCounts = useMemo(() => {
    const counts = new Map<string, number>();
    words.forEach((w) => w.topics.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return counts;
  }, [words]);
  const savedCount = useMemo(() => words.filter((w) => saved.has(w.key)).length, [words, saved]);
  const filtered = useMemo(
    () => searchVocabulary(words, query, topic).filter((w) => !savedOnly || saved.has(w.key)),
    [words, query, topic, savedOnly, saved]
  );
  const focusedWord = detail?.pool[detail.index];
  const word = focusedWord
    ? (words.find((entry) => entry.sourceIds.includes(focusedWord.id)) ?? focusedWord)
    : undefined;
  const resetDetailTools = useCallback(() => {
    setStrokeOpen(false);
    setStrokeIndex(0);
    setReplay(0);
    detailScroll.current?.scrollTo({ y: 0, animated: false });
  }, []);
  const openWord = useCallback(
    (pool: StudyWord[], index: number) => {
      stop();
      setDetail({ pool, index });
      resetDetailTools();
      setMode("detail");
    },
    [stop, resetDetailTools]
  );
  const closeDetail = useCallback(() => {
    stop();
    setMode("browse");
    if (fromList.current && params.fromListId) {
      fromList.current = false;
      router.navigate({ pathname: "/(tabs)/practice/[id]", params: { id: params.fromListId } });
    }
  }, [stop, params.fromListId]);
  useAndroidBack(mode === "detail" && !topicSheet && !about, closeDetail);
  useEffect(() => {
    const key = params.focusNonce ?? params.focusItemId;
    if (!params.focusItemId || !words.length || consumedFocus.current === key) return;
    const index = words.findIndex((entry) =>
      entry.sourceIds.some((id) => String(id) === params.focusItemId)
    );
    if (index < 0) return;
    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        consumedFocus.current = key ?? null;
        fromList.current = true;
        openWord(words, index);
      }
    });
    return () => {
      active = false;
    };
  }, [params.focusItemId, params.focusNonce, words, openWord]);
  const toggleSaved = (entry: StudyWord) => {
    if (!savedReady) return;
    const next = new Set(savedRef.current);
    if (next.has(entry.key)) next.delete(entry.key);
    else next.add(entry.key);
    savedRef.current = next;
    setSaved(next);
    void writeCache(bookmarkKey, [...next]);
  };
  const changeFilters = (change: () => void) => {
    change();
    setRevealed(new Set());
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  };
  const startPractice = () => {
    stop();
    setQuizSelection({
      words: [...filtered],
      label: [
        savedOnly ? "Saved words" : "Your collection",
        topic !== "All" ? topic : null,
        query.trim() ? `Search: ${query.trim()}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });
    setMode("quiz");
  };

  const readingControls = (
    <>
      <VocabControl
        label="Romaji pronunciation"
        icon="text-outline"
        glyph="Aa"
        color="#99C7FA"
        active={showRomaji}
        onPress={() => setShowRomaji(!showRomaji)}
        testID="vocab-romaji-toggle"
      />
      <VocabControl
        label="Hindi pronunciation"
        icon="language-outline"
        glyph="अ"
        color="#F0B3CE"
        active={showHindi}
        onPress={() => setShowHindi(!showHindi)}
        testID="vocab-hindi-toggle"
      />
      {mode === "browse" && (
        <VocabControl
          label={hideMeanings ? "Show meanings" : "Hide meanings for recall"}
          icon={hideMeanings ? "eye-off-outline" : "eye-outline"}
          color="#C9B6FA"
          active={hideMeanings}
          onPress={() => {
            setHideMeanings(!hideMeanings);
            setRevealed(new Set());
          }}
          testID={"vocab-meaning-toggle"}
        />
      )}
    </>
  );
  const pronunciations = (entry: StudyWord) => (
    <>
      {showRomaji && <Text style={s.romaji}>{entry.romaji}</Text>}
      {showHindi && (
        <Text style={s.hindi}>
          {entry.romaji_hindi ? `हिं · ${entry.romaji_hindi}` : "Hindi pronunciation unavailable"}
        </Text>
      )}
    </>
  );
  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {mode === "browse" && (
        <>
          <LinearGradient
            colors={["#262344", "#162D40", "#112B34"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.headerSurface}
          >
            <View style={s.header}>
              <View style={s.flex}>
                <Text style={s.browseHeading}>Vocabulary</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="About this vocabulary collection"
                  onPress={() => setAbout(true)}
                  style={s.collectionLink}
                >
                  <Text style={s.muted}>N5 study collection</Text>
                  <Ionicons name="information-circle-outline" size={14} color="#A6A0BD" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                testID="vocab-practice"
                accessibilityRole="button"
                accessibilityLabel="Practice filtered vocabulary"
                accessibilityState={{ disabled: !filtered.length }}
                disabled={!filtered.length}
                onPress={startPractice}
                style={[s.primaryButton, s.practiceButton, !filtered.length && { opacity: 0.4 }]}
              >
                <Ionicons name="school-outline" size={17} color="#fff" />
                <Text style={s.buttonText}>Practice</Text>
              </TouchableOpacity>
              <VocabIconButton
                testID="vocab-search-toggle"
                name={searchOpen ? "close" : "search-outline"}
                label={searchOpen ? "Close vocabulary search" : "Open vocabulary search"}
                active={searchOpen}
                onPress={() => {
                  if (searchOpen) {
                    changeFilters(() => setQuery(""));
                    Keyboard.dismiss();
                  }
                  setSearchOpen(!searchOpen);
                }}
              />
            </View>
            {searchOpen && (
              <View style={s.searchBox}>
                <Ionicons name="search-outline" size={19} color="#A6A0BD" />
                <TextInput
                  testID="vocab-search"
                  accessibilityLabel="Search vocabulary"
                  value={query}
                  onChangeText={(value) => changeFilters(() => setQuery(value))}
                  placeholder="Japanese, English, Romaji or Hindi"
                  placeholderTextColor="#8F87A7"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="search"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  style={s.searchInput}
                />
                {query ? (
                  <VocabIconButton
                    name={"close-circle"}
                    label={"Clear vocabulary search"}
                    onPress={() => changeFilters(() => setQuery(""))}
                  />
                ) : null}
              </View>
            )}
            <View style={s.filters}>
              <VocabControl
                label={"All words"}
                icon={"albums-outline"}
                active={!savedOnly && topic === "All"}
                onPress={() =>
                  changeFilters(() => {
                    setSavedOnly(false);
                    setTopic("All");
                  })
                }
                testID="vocab-all-filter"
              />
              <VocabControl
                label={`Saved ${savedCount}`}
                icon={savedOnly ? "bookmark" : "bookmark-outline"}
                color="#F2CD8F"
                active={savedOnly}
                onPress={() => changeFilters(() => setSavedOnly(!savedOnly))}
                testID={"vocab-saved-filter"}
              />
              <VocabControl
                label={topic === "All" ? "Choose topic" : `Choose topic: ${topic}`}
                icon={"options-outline"}
                color="#8CDECF"
                active={topic !== "All"}
                onPress={() => {
                  setTopicQuery("");
                  setTopicSheet(true);
                }}
                testID={"vocab-topics"}
              />
              {readingControls}
            </View>
          </LinearGradient>
          <View style={s.resultsRow}>
            <Text style={s.muted}>
              {filtered.length} {filtered.length === 1 ? "word" : "words"}
              {topic !== "All" ? ` · ${topic}` : ` · ${topics.length} topics`}
            </Text>
            {content.refreshing ? (
              <ActivityIndicator size="small" color="#A78BFA" />
            ) : (
              <VocabIconButton
                name={content.error ? "cloud-download-outline" : "refresh-outline"}
                label={
                  content.error ? "Using cached vocabulary. Retry refresh" : "Refresh vocabulary"
                }
                color={content.error ? "#FBBF24" : undefined}
                onPress={refresh}
              />
            )}
          </View>
          {!words.length ? (
            content.refreshing ? (
              <View style={s.center}>
                <ActivityIndicator color="#A78BFA" />
                <Text style={s.muted}>Loading your word collection…</Text>
              </View>
            ) : (
              <LoadError
                onRetry={refresh}
                offline={isOfflineError(content.error)}
                message="Vocabulary could not be loaded"
              />
            )
          ) : (
            <FlatList
              ref={listRef}
              data={filtered}
              keyExtractor={(entry) => entry.key}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={s.list}
              initialNumToRender={10}
              maxToRenderPerBatch={12}
              windowSize={7}
              renderItem={({ item, index }) => (
                <View style={[s.wordCard, { borderLeftColor: `${topicColor(item.topic)}85` }]}>
                  <View style={s.wordTop}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Open word ${writtenWord(item)}`}
                      testID={`vocab-word-${item.id}`}
                      onPress={() => openWord(filtered, index)}
                      style={s.wordMain}
                    >
                      <Text style={s.japanese}>{writtenWord(item)}</Text>
                      {writtenWord(item) !== item.hiragana && (
                        <Text style={s.kana}>{item.hiragana}</Text>
                      )}
                      {pronunciations(item)}
                    </TouchableOpacity>
                    <View style={s.wordSide}>
                      <View style={s.wordTools}>
                        {
                          <VocabIconButton
                            name={speaking === item.id ? "volume-high" : "volume-medium-outline"}
                            label={`Listen to ${writtenWord(item)}`}
                            onPress={() => void speak(item)}
                            active={speaking === item.id}
                            color="#8BDDD1"
                          />
                        }
                        {
                          <VocabIconButton
                            name={saved.has(item.key) ? "bookmark" : "bookmark-outline"}
                            label={`${saved.has(item.key) ? "Unsave" : "Save"} ${writtenWord(item)}`}
                            onPress={() => toggleSaved(item)}
                            active={saved.has(item.key)}
                            color="#EDC888"
                            disabled={!savedReady}
                          />
                        }
                      </View>
                      <Text style={[s.topicLabel, { color: topicColor(item.topic) }]}>
                        {item.topics.join(" · ")}
                      </Text>
                    </View>
                  </View>
                  {hideMeanings && !revealed.has(item.key) ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Reveal meaning of ${writtenWord(item)}`}
                      onPress={() => setRevealed((previous) => new Set(previous).add(item.key))}
                      style={s.reveal}
                    >
                      <Ionicons name="eye-outline" size={16} color="#C4B5FD" />
                      <Text style={s.revealText}>Reveal meaning</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={s.meaningRow}>
                      <Text accessible={false} style={s.wordEmoji}>
                        {wordIcon(item)}
                      </Text>
                      <Text style={[s.meaning, s.flex]}>{item.english}</Text>
                    </View>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <View style={s.empty}>
                  <Ionicons
                    name={savedOnly ? "bookmark-outline" : "search-outline"}
                    size={35}
                    color="#A78BFA"
                  />
                  <Text style={s.title}>
                    {savedOnly && !savedCount ? "Keep useful words close" : "No matching words"}
                  </Text>
                  <Text style={s.body}>
                    {savedOnly && !savedCount
                      ? "Tap a bookmark beside any word to save it here."
                      : "Try another spelling or clear your filters."}
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() =>
                      changeFilters(() => {
                        setQuery("");
                        setTopic("All");
                        setSavedOnly(false);
                      })
                    }
                    style={s.secondaryButton}
                  >
                    <Text style={s.buttonText}>Browse all words</Text>
                  </TouchableOpacity>
                </View>
              }
              ListFooterComponent={
                filtered.length ? (
                  <Text style={s.listFooter}>Listen. Recall. Use the word in a sentence.</Text>
                ) : null
              }
            />
          )}
        </>
      )}
      {mode === "detail" && word && detail && (
        <>
          <LinearGradient
            colors={["#25213F", "#15303D"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.detailHeader}
          >
            {
              <VocabIconButton
                name={"arrow-back"}
                label={"Back to vocabulary"}
                onPress={closeDetail}
              />
            }
            <View style={s.flex}>
              <Text style={s.title}>Word study</Text>
              <Text style={s.muted}>
                {detail.index + 1} of {detail.pool.length}
              </Text>
            </View>
            {
              <VocabIconButton
                name={"chevron-back"}
                label={"Previous vocabulary word"}
                onPress={() => openWord(detail.pool, detail.index - 1)}
                active={false}
                disabled={detail.index === 0}
              />
            }
            {
              <VocabIconButton
                name={"chevron-forward"}
                label={"Next vocabulary word"}
                onPress={() => openWord(detail.pool, detail.index + 1)}
                active={false}
                disabled={detail.index + 1 === detail.pool.length}
              />
            }
          </LinearGradient>
          <ScrollView
            ref={detailScroll}
            contentContainerStyle={s.detailContent}
            showsVerticalScrollIndicator={false}
          >
            <LinearGradient
              colors={["#252D4A", "#172C3D", "#152D33"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.wordHero}
            >
              <View
                style={[
                  s.heroTopic,
                  {
                    borderColor: `${topicColor(word.topic)}40`,
                    backgroundColor: `${topicColor(word.topic)}12`,
                  },
                ]}
              >
                <Text style={[s.eyebrow, { color: topicColor(word.topic) }]}>
                  {word.topics.join(" · ")}
                </Text>
              </View>
              <Text style={s.largeJapanese}>{writtenWord(word)}</Text>
              <Text style={s.largeReading}>{word.hiragana}</Text>
              {pronunciations(word)}
              <View style={s.divider} />
              <Text style={s.largeMeaning}>
                {wordIcon(word)} {word.english}
              </Text>
              <View style={s.actions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Listen to word"
                  accessibilityState={{ selected: speaking === word.id && speechMode === "normal" }}
                  onPress={() => void speak(word)}
                  style={[
                    s.listenButton,
                    speaking === word.id && speechMode === "normal" && s.listenActive,
                  ]}
                >
                  <Ionicons
                    name={
                      speaking === word.id && speechMode === "normal"
                        ? "volume-high"
                        : "volume-medium-outline"
                    }
                    size={20}
                    color="#C5FFF1"
                  />
                  <Text style={s.buttonText}>Listen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Listen slowly"
                  accessibilityState={{ selected: speaking === word.id && speechMode === "slow" }}
                  onPress={() => void speak(word, true)}
                  style={[
                    s.slowButton,
                    speaking === word.id && speechMode === "slow" && s.slowActive,
                  ]}
                >
                  <Ionicons name="speedometer-outline" size={19} color="#F4D599" />
                  <Text style={s.buttonText}>Slow</Text>
                </TouchableOpacity>
                {
                  <VocabIconButton
                    name={saved.has(word.key) ? "bookmark" : "bookmark-outline"}
                    label={`${saved.has(word.key) ? "Unsave" : "Save"} ${writtenWord(word)}`}
                    onPress={() => toggleSaved(word)}
                    active={saved.has(word.key)}
                    color="#EDC888"
                    disabled={!savedReady}
                  />
                }
              </View>
              {speaking === word.id && (
                <Text accessibilityLiveRegion="polite" style={s.audioStatus}>
                  {speechMode === "slow" ? "Playing slowly…" : "Playing at normal speed…"}
                </Text>
              )}
              {audioError && (
                <Text style={s.muted}>
                  Audio is unavailable. Check the Japanese voice settings on your device.
                </Text>
              )}
            </LinearGradient>
            <View style={s.controls}>{readingControls}</View>
            {showHindi && (
              <Text style={s.hint}>
                Hindi text is a pronunciation aid, not a meaning translation. Listen for the
                Japanese sound.
              </Text>
            )}
            {word.hiragana.includes("/") && (
              <View style={s.infoCard}>
                <Text style={s.title}>More than one reading</Text>
                <Text style={s.body}>
                  This entry lists alternative readings. Listen plays the first:{" "}
                  {primaryReading(word)}. The reading used can depend on context.
                </Text>
              </View>
            )}
            <View style={s.infoCard}>
              <Text style={s.title}>Make it part of your routine</Text>
              <Text style={s.body}>
                Listen once, say it aloud, then hide the meaning in the word list and recall it
                yourself.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Add vocabulary to practice list"
                onPress={() => (session ? setAddList(true) : setListAuth(true))}
                style={s.secondaryButton}
              >
                <Ionicons name="add-circle-outline" size={20} color="#C4B5FD" />
                <Text style={s.buttonText}>Add to practice list</Text>
              </TouchableOpacity>
            </View>
            <View style={s.infoCard}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  strokeOpen ? "Hide word stroke order" : "Show word stroke order"
                }
                accessibilityState={{ expanded: strokeOpen }}
                onPress={() => setStrokeOpen(!strokeOpen)}
                style={s.expandRow}
              >
                <Ionicons name="pencil-outline" size={20} color="#C4B5FD" />
                <Text style={[s.title, s.flex]}>Writing & stroke order</Text>
                <Ionicons
                  name={strokeOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#A6A0BD"
                />
              </TouchableOpacity>
              {strokeOpen && (
                <>
                  <Text style={s.body}>Choose a character, then replay to follow its strokes.</Text>
                  <View style={s.characterTabs}>
                    {[...writtenWord(word)].map((character, index) => (
                      <TouchableOpacity
                        key={index}
                        accessibilityRole="button"
                        accessibilityLabel={`Show strokes for ${character}, character ${index + 1}`}
                        onPress={() => {
                          setStrokeIndex(index);
                          setReplay(0);
                        }}
                        style={[s.characterTab, strokeIndex === index && s.chipActive]}
                      >
                        <Text style={s.japanese}>{character}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={s.centerStroke}>
                    <StrokeWriter
                      key={`${word.key}-${strokeIndex}-${replay}`}
                      character={[...writtenWord(word)][strokeIndex] ?? writtenWord(word)[0]}
                      size={180}
                      color="#DDD6FE"
                      showUnavailableMessage
                    />
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Replay word stroke animation"
                    onPress={() => setReplay(replay + 1)}
                    style={s.secondaryButton}
                  >
                    <Ionicons name="refresh-outline" size={18} color="#C4B5FD" />
                    <Text style={s.buttonText}>Replay stroke order</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            <View style={s.infoCard}>
              <Text style={s.title}>Word information</Text>
              {[
                { label: "Japanese", value: writtenWord(word) },
                { label: "Reading", value: word.hiragana },
                ...(showRomaji ? [{ label: "Romaji", value: word.romaji }] : []),
                { label: "Meaning", value: word.english },
                { label: "Study level", value: `${word.jlpt_level} collection` },
              ].map((row) => (
                <View key={row.label} style={s.infoRow}>
                  <Text style={s.muted}>{row.label}</Text>
                  <Text style={s.infoValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </>
      )}
      {mode === "quiz" && quizSelection && (
        <VocabularyPractice
          words={quizSelection.words}
          allWords={words}
          label={quizSelection.label}
          onClose={() => setMode("browse")}
        />
      )}
      <Modal
        visible={topicSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setTopicSheet(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.sheet, { paddingBottom: Math.max(20, insets.bottom) }]}>
            <View style={s.sheetHeader}>
              <View style={s.flex}>
                <Text style={s.heading}>Find your topic</Text>
                <Text style={s.muted}>Choose from {topics.length} study topics</Text>
              </View>
              {
                <VocabIconButton
                  name={"close"}
                  label={"Close topic picker"}
                  onPress={() => setTopicSheet(false)}
                />
              }
            </View>
            <TextInput
              accessibilityLabel="Search topics"
              value={topicQuery}
              onChangeText={setTopicQuery}
              placeholder="Search topics"
              placeholderTextColor="#8F87A7"
              style={s.topicSearch}
            />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {["All", ...topics]
                .filter((t) => t.toLowerCase().includes(topicQuery.toLowerCase().trim()))
                .map((t) => (
                  <TouchableOpacity
                    key={t}
                    accessibilityRole="button"
                    accessibilityLabel={`Select topic ${t}`}
                    onPress={() => {
                      changeFilters(() => setTopic(t));
                      setTopicSheet(false);
                    }}
                    style={[s.topicRow, topic === t && s.chipActive]}
                  >
                    <Text style={[s.title, s.flex]}>{t === "All" ? "All topics" : t}</Text>
                    <Text style={s.muted}>{t === "All" ? words.length : topicCounts.get(t)}</Text>
                    <Ionicons
                      name={topic === t ? "checkmark-circle" : "chevron-forward"}
                      size={20}
                      color="#A78BFA"
                    />
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={about}
        transparent
        animationType="fade"
        onRequestClose={() => setAbout(false)}
      >
        <View style={s.aboutOverlay}>
          <View style={s.aboutCard}>
            <ScrollView contentContainerStyle={s.aboutContent} showsVerticalScrollIndicator={false}>
              <Text style={s.heading}>About this collection</Text>
              <Text style={s.body}>
                An app-curated collection for N5 study and everyday Japanese. Level labels are study
                guidance: the JLPT does not publish an exhaustive vocabulary list.
              </Text>
              <Text style={s.body}>
                English gives the meaning. Romaji and Hindi help with pronunciation. Some words have
                multiple readings or meanings depending on the sentence.
              </Text>
              <Text style={s.body}>
                Bookmarks are saved on this device. Use a practice list to sync words to your
                account.
              </Text>
              <TouchableOpacity
                accessibilityRole="link"
                onPress={() => void Linking.openURL("https://www.jlpt.jp/e/faq/index.html")}
                style={s.secondaryButton}
              >
                <Text style={s.buttonText}>Read the official JLPT FAQ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setAbout(false)}
                style={s.primaryButton}
              >
                <Text style={s.buttonText}>Got it</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {word && (
        <AddToListModal
          visible={addList}
          onClose={() => setAddList(false)}
          itemType="vocabulary"
          itemId={word.id}
          itemTitle={writtenWord(word)}
          studyItem={{
            listItemId: "pending",
            itemType: "vocabulary",
            itemId: String(word.id),
            front: writtenWord(word),
            back: word.english,
            correctAnswer: word.english,
            audioText: primaryReading(word),
            masteryScore: 0,
            lastReviewed: null,
          }}
        />
      )}
      <AuthPromptModal
        visible={listAuth}
        feature="practice lists"
        redirectTo="/(tabs)/vocabulary"
        description="Sign in to save words in practice lists and sync progress across devices."
        onClose={() => setListAuth(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0C1322" },
  flex: { flex: 1 },
  headerSurface: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#304357",
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  browseHeading: { color: "#F8F4EC", fontSize: 24, fontWeight: "800" },
  practiceButton: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 10, gap: 5 },
  eyebrow: { color: "#C4B5FD", fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  heading: { color: "#FAF8FF", fontSize: 28, fontWeight: "800", marginTop: 4 },
  title: { color: "#F5F1FF", fontSize: 16, fontWeight: "700" },
  muted: { color: "#A6B7D0", fontSize: 12, lineHeight: 18 },
  body: { color: "#C5D0E2", fontSize: 14, lineHeight: 22 },
  collectionLink: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  primaryButton: {
    minHeight: 46,
    backgroundColor: "#7057CD",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButton: {
    minHeight: 46,
    backgroundColor: "#27354D",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: { color: "#FAF8FF", fontSize: 13, fontWeight: "700" },
  searchBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#3C4D64",
    backgroundColor: "#101C2F",
    borderRadius: 15,
    minHeight: 44,
    paddingLeft: 14,
    paddingRight: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14, paddingVertical: 13, minWidth: 0 },
  filters: { flexDirection: "row", justifyContent: "space-between", gap: 4, paddingHorizontal: 16 },
  controls: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  control: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#111E32",
    borderWidth: 1,
    borderColor: "#354158",
  },
  chipActive: { backgroundColor: "#37315D", borderColor: "#A18BDC" },
  controlGlyph: { color: "#BFB7D3", fontSize: 20, fontWeight: "600" },
  resultsRow: {
    minHeight: 44,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hint: {
    color: "#ACA3C2",
    fontSize: 11,
    lineHeight: 17,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 9 },
  wordCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderLeftWidth: 2,
    borderColor: "#2A3850",
    backgroundColor: "#172238",
    padding: 12,
    gap: 6,
  },
  wordTop: { flexDirection: "row", gap: 8 },
  wordMain: { flex: 1, minWidth: 0, gap: 3 },
  wordSide: { width: "42%", maxWidth: 150, minWidth: 94, alignItems: "flex-end", gap: 4 },
  wordTools: { flexDirection: "row", gap: 6 },
  japanese: { color: "#F4F6FC", fontSize: 24, fontWeight: "700", lineHeight: 32 },
  kana: { color: "#B5C6E0", fontSize: 13, lineHeight: 19 },
  romaji: { color: "#C4B5FD", fontSize: 13, lineHeight: 20 },
  hindi: { color: "#BECCD5", fontSize: 12, lineHeight: 20 },
  meaning: { color: "#DEE7F4", fontSize: 15, lineHeight: 23 },
  meaningRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  wordEmoji: { fontSize: 20, lineHeight: 24 },
  topicLabel: { fontSize: 10, lineHeight: 14, textAlign: "right", alignSelf: "stretch" },
  iconButton: {
    minWidth: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#1D2D43",
    borderWidth: 1,
    borderColor: "#35435B",
  },
  reveal: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 40 },
  revealText: { color: "#C4B5FD", fontSize: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  empty: { alignItems: "center", gap: 12, paddingVertical: 34, paddingHorizontal: 20 },
  listFooter: { color: "#9387AD", fontSize: 12, textAlign: "center", marginVertical: 20 },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#344257",
  },
  detailContent: { padding: 18, paddingBottom: 30, gap: 16 },
  wordHero: {
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#3E506A",
  },
  heroTopic: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  largeJapanese: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "700",
    lineHeight: 58,
    textAlign: "center",
  },
  largeReading: { color: "#B5C7F1", fontSize: 18, lineHeight: 29, textAlign: "center" },
  largeMeaning: {
    color: "#F3EFFF",
    fontSize: 21,
    fontWeight: "600",
    lineHeight: 30,
    textAlign: "center",
  },
  divider: { height: 1, backgroundColor: "#3B5064", alignSelf: "stretch", marginVertical: 5 },
  listenButton: {
    minHeight: 46,
    paddingHorizontal: 15,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#17666B",
    borderWidth: 1,
    borderColor: "#328C8C",
  },
  listenActive: { backgroundColor: "#217D7C", borderColor: "#9DEDDD" },
  slowButton: {
    minHeight: 46,
    paddingHorizontal: 15,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#3B3546",
    borderWidth: 1,
    borderColor: "#8F7959",
  },
  slowActive: { backgroundColor: "#66513A", borderColor: "#F0CE90" },
  audioStatus: { color: "#C6DBE4", fontSize: 12, lineHeight: 18 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  infoCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#172338",
    gap: 12,
    borderWidth: 1,
    borderColor: "#304159",
  },
  expandRow: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10 },
  characterTabs: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  characterTab: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#3C4D65",
    borderRadius: 12,
    minWidth: 48,
    alignItems: "center",
  },
  centerStroke: { alignItems: "center" },
  infoRow: { flexDirection: "row", gap: 20, justifyContent: "space-between", paddingVertical: 8 },
  infoValue: { color: "#E9E2F5", fontSize: 13, lineHeight: 21, flex: 1, textAlign: "right" },
  modalOverlay: { flex: 1, backgroundColor: "#0009", justifyContent: "flex-end" },
  sheet: {
    maxHeight: "88%",
    backgroundColor: "#172338",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  topicSearch: {
    backgroundColor: "#22344B",
    borderRadius: 13,
    padding: 14,
    color: "#fff",
    marginBottom: 14,
    minHeight: 48,
  },
  topicRow: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderColor: "#314159",
    borderRadius: 10,
  },
  aboutOverlay: { flex: 1, backgroundColor: "#000A", justifyContent: "center", padding: 24 },
  aboutCard: {
    maxHeight: "100%",
    borderRadius: 24,
    backgroundColor: "#19283C",
    overflow: "hidden",
  },
  aboutContent: { padding: 24, gap: 18 },
});
