import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  ScrollView,
  SectionList,
  ActivityIndicator,
} from "react-native";
import * as Speech from "expo-speech";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import { AddToListModal } from "@/components/AddToListModal";
import { AuthPromptModal } from "@/components/AuthPromptModal";
import StrokeWriter from "@/components/StrokeWriter";
import KanaPractice from "@/components/KanaPractice";
import { useAuth } from "@/lib/auth";
import { useAndroidBack } from "@/lib/use-android-back";
import { LoadError } from "@/components/LoadError";
import { getRememberedKana, loadKana } from "@/lib/kana-loader";
import { auditKanaInventory, kanaBreakdown, type KanaType } from "@/lib/kana-catalog";
import { kanaLearningInfo } from "@/lib/kana-learning-info";
import { isOfflineError } from "@/lib/connectivity";
import { OfflineNotice } from "@/components/OfflineNotice";
import type { Kana } from "@japangolearn/database";

// ─── Types ───
type ViewMode = "grid" | "detail" | "quiz";

// ─── Constants ───
const GRID_COLS = 5;
const CARD_GAP = 6;
const GRID_PAD = 16;

const KANA_COLORS = {
  bg: "#0C1322",
  card: "#172238",
  surface: "#203047",
  border: "#2D3C53",
  text: "#F3F5FC",
  textSecondary: "#B8C5D9",
  textMuted: "#95A6C0",
  lavender: "#C4B8F0",
  teal: "#8CDECF",
  gold: "#EAC88F",
};

const GROUP_LABELS: Record<string, { label: string; kana: string }> = {
  "a-row": { label: "Vowels", kana: "あ" },
  "ka-row": { label: "Ka", kana: "か" },
  "sa-row": { label: "Sa", kana: "さ" },
  "ta-row": { label: "Ta", kana: "た" },
  "na-row": { label: "Na", kana: "な" },
  "ha-row": { label: "Ha", kana: "は" },
  "ma-row": { label: "Ma", kana: "ま" },
  "ya-row": { label: "Ya", kana: "や" },
  "ra-row": { label: "Ra", kana: "ら" },
  "wa-row": { label: "Wa", kana: "わ" },
  "n-row": { label: "N", kana: "ん" },
  "ga-row": { label: "Ga", kana: "が" },
  "za-row": { label: "Za", kana: "ざ" },
  "da-row": { label: "Da", kana: "だ" },
  "ba-row": { label: "Ba", kana: "ば" },
  "pa-row": { label: "Pa", kana: "ぱ" },
  combo: { label: "Combos", kana: "拗" },
  loanword: { label: "Loanword sounds", kana: "ファ" },
};

const GROUP_COLORS: Record<string, string> = {
  "a-row": "#A78BFA",
  "ka-row": "#60A5FA",
  "sa-row": "#2DD4BF",
  "ta-row": "#34D399",
  "na-row": "#10B981",
  "ha-row": "#FBBF24",
  "ma-row": "#FB923C",
  "ya-row": "#F87171",
  "ra-row": "#F472B6",
  "wa-row": "#FB7185",
  "n-row": "#C084FC",
  "ga-row": "#38BDF8",
  "za-row": "#818CF8",
  "da-row": "#22D3EE",
  "ba-row": "#E879F9",
  "pa-row": "#A3E635",
  combo: "#FACC15",
  loanword: "#38BDF8",
};

function formatGroup(group: string): string {
  return GROUP_LABELS[group]?.label || group;
}

// ─── Main Component ───
export default function WritingScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const chartWidth = Math.min(width, 640);
  const { session } = useAuth();
  // Set when another screen wants a specific character opened. The type comes
  // with it because the grid only ever loads one syllabary at a time, so a
  // katakana id would not be found while hiragana is showing.
  const { focusItemId, focusKanaType, focusNonce, fromListId } = useLocalSearchParams<{
    focusItemId?: string;
    focusKanaType?: string;
    focusNonce?: string;
    fromListId?: string;
  }>();
  // The nonce makes repeat taps on the same item distinct; without it the
  // params would be identical and this screen, still mounted, would ignore them.
  const focusKey = focusNonce ?? focusItemId ?? null;
  const consumedFocusRef = useRef<string | null>(null);
  // See vocabulary.tsx: when the detail was opened from another screen, back
  // pops that route instead of returning to this tab's grid.
  const openedViaFocusRef = useRef(false);
  const [kanaList, setKanaList] = useState<Kana[]>(() => getRememberedKana("hiragana")?.data ?? []);
  const [loadFailed, setLoadFailed] = useState(false);
  const [offline, setOffline] = useState(false);
  const [servedFrom, setServedFrom] = useState<number | null>(null);
  const [kanaType, setKanaType] = useState<KanaType>("hiragana");
  const requestRef = useRef<AbortController | null>(null);
  const [mode, setMode] = useState<ViewMode>("grid");
  // Detail state
  const [selectedKana, setSelectedKana] = useState<Kana | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [strokeReplay, setStrokeReplay] = useState(0);
  const [loadedStrokes, setLoadedStrokes] = useState<{ id: number; count: number | null } | null>(
    null
  );
  const speechRequestRef = useRef(0);
  const onStrokesLoaded = useCallback(
    (count: number | null) => {
      if (selectedKana) setLoadedStrokes({ id: selectedKana.id, count });
    },
    [selectedKana]
  );

  // Closing detail or quiz. Returns to the grid, unless the detail was opened
  // from another screen, in which case it pops back to that screen. Only detail
  // is ever focus-opened, so the quiz path always just returns to the grid.
  const closeOverlay = useCallback(() => {
    speechRequestRef.current += 1;
    void Speech.stop();
    setIsSpeaking(false);
    setMode("grid");
    // Opened from a practice list: navigate back to that list by id. See
    // vocabulary.tsx — router.back() across tab navigators is not reliable.
    if (openedViaFocusRef.current && fromListId) {
      openedViaFocusRef.current = false;
      router.navigate({ pathname: "/(tabs)/practice/[id]", params: { id: fromListId } });
    }
  }, [fromListId]);

  // Detail and quiz are local state, not routes, so Android's back button would
  // otherwise leave the screen entirely instead of returning to the grid.
  useAndroidBack(mode === "detail", closeOverlay);

  // Custom List State
  const [showAddListModal, setShowAddListModal] = useState(false);
  const [showListAuthPrompt, setShowListAuthPrompt] = useState(false);
  const [showHindi, setShowHindi] = useState(false);
  const [showRomaji, setShowRomaji] = useState(false);
  const [loading, setLoading] = useState(() => !getRememberedKana("hiragana"));
  const [refreshing, setRefreshing] = useState(false);
  const [activeGroup, setActiveGroup] = useState("All");

  const practiceReturnMode = useRef<"grid" | "detail">("grid");

  // Animations
  const [cardAnim] = useState(() => new Animated.Value(0));

  const isHiragana = kanaType === "hiragana";

  const fetchKana = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const remembered = getRememberedKana(kanaType);
    setKanaList(remembered?.data ?? []);
    setLoading(!remembered);
    setRefreshing(true);
    setLoadFailed(false);
    setServedFrom(null);
    setOffline(false);
    await loadKana(
      kanaType,
      (result) => {
        setKanaList(result.data);
        setLoading(false);
        setRefreshing(result.refreshing);
        setLoadFailed(!!result.error && result.data.length === 0);
        setOffline(isOfflineError(result.error));
        setServedFrom(result.error && result.data.length > 0 ? result.savedAt : null);
      },
      controller.signal
    );
  }, [kanaType]);

  useEffect(() => {
    void fetchKana();
    setSelectedKana(null);
    setActiveGroup("All");
    setMode("grid");
    return () => requestRef.current?.abort();
  }, [fetchKana]);

  // Filtered list
  const filtered = useMemo(() => {
    return kanaList.filter(
      (k) => k.type === kanaType && (activeGroup === "All" || k.group_name === activeGroup)
    );
  }, [kanaList, kanaType, activeGroup]);

  const inventory = useMemo(() => auditKanaInventory(kanaList, kanaType), [kanaList, kanaType]);
  const breakdown = useMemo(() => kanaBreakdown(kanaList), [kanaList]);

  const groupNames = useMemo(() => {
    return ["All", ...Array.from(new Set(kanaList.map((k) => k.group_name)))];
  }, [kanaList]);

  // Groups for sectioned grid
  const groupedKana = useMemo(() => {
    const groups = new Map<string, Kana[]>();
    for (const k of filtered) {
      const group = groups.get(k.group_name) ?? [];
      group.push(k);
      groups.set(k.group_name, group);
    }
    return [...groups].map(([name, items]) => {
      const columns = name === "combo" || name === "loanword" ? 3 : GRID_COLS;
      const data: Kana[][] = [];
      for (let i = 0; i < items.length; i += columns) data.push(items.slice(i, i + columns));
      return { name, count: items.length, columns, data };
    });
  }, [filtered]);

  const filteredIndices = useMemo(
    () => new Map(filtered.map((kana, index) => [kana.id, index])),
    [filtered]
  );

  // ─── Helpers ───
  const speakKana = useCallback((kana: Kana) => {
    const request = ++speechRequestRef.current;
    setIsSpeaking(true);
    const finish = () => {
      if (speechRequestRef.current === request) setIsSpeaking(false);
    };
    void Speech.stop()
      .then(() => {
        if (speechRequestRef.current !== request) return;
        Speech.speak(kana.character, {
          language: "ja-JP",
          pitch: 1.1,
          rate: 0.7,
          onDone: finish,
          onStopped: finish,
          onError: finish,
        });
      })
      .catch(finish);
  }, []);

  useEffect(
    () => () => {
      speechRequestRef.current += 1;
      void Speech.stop();
    },
    []
  );

  const openAddToList = () => {
    if (session) {
      setShowAddListModal(true);
    } else {
      setShowListAuthPrompt(true);
    }
  };

  const openDetail = useCallback(
    (kana: Kana, idx: number) => {
      setSelectedKana(kana);
      setSelectedIndex(idx);
      setMode("detail");
      cardAnim.setValue(0);
      Animated.spring(cardAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 9,
      }).start();
      speakKana(kana);
    },
    [speakKana, cardAnim]
  );

  /*
   * Opens the character named by ?focusItemId once its syllabary has loaded,
   * switching syllabary and clearing the group filter first if either would
   * otherwise hide it. Index comes from `filtered` so the prev/next arrows keep
   * working on a character opened this way.
   */
  useEffect(() => {
    if (!focusItemId) return;
    if (consumedFocusRef.current === focusKey) return;

    if (
      (focusKanaType === "hiragana" || focusKanaType === "katakana") &&
      focusKanaType !== kanaType
    ) {
      setKanaType(focusKanaType);
      return;
    }

    if (loading || kanaList.length === 0 || kanaList.some((kana) => kana.type !== kanaType)) return;

    const index = filtered.findIndex((kana) => String(kana.id) === focusItemId);
    if (index >= 0) {
      consumedFocusRef.current = focusKey;
      openedViaFocusRef.current = true;
      openDetail(filtered[index], index);
      return;
    }

    if (kanaList.some((kana) => String(kana.id) === focusItemId)) {
      setActiveGroup("All");
    } else {
      consumedFocusRef.current = focusKey;
    }
  }, [focusItemId, focusKey, focusKanaType, kanaType, kanaList, filtered, openDetail, loading]);

  const navigateKana = useCallback(
    (direction: 1 | -1) => {
      const list = filtered;
      const newIdx = selectedIndex + direction;
      if (newIdx < 0 || newIdx >= list.length) return;
      const kana = list[newIdx];
      setSelectedKana(kana);
      setSelectedIndex(newIdx);
      cardAnim.setValue(0);
      Animated.spring(cardAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 9,
      }).start();
      speakKana(kana);
    },
    [filtered, selectedIndex, speakKana, cardAnim]
  );

  const startQuiz = () => {
    speechRequestRef.current += 1;
    void Speech.stop();
    setIsSpeaking(false);
    practiceReturnMode.current = mode === "detail" ? "detail" : "grid";
    setMode("quiz");
  };
  const renderPronunciationControls = () => (
    <View style={s.pronunciationButtons}>
      <TouchableOpacity
        style={[s.pronunciationBtn, showRomaji && s.romajiBtnActive]}
        onPress={() => setShowRomaji((shown) => !shown)}
        accessibilityRole="button"
        accessibilityLabel={showRomaji ? "Hide romaji pronunciation" : "Show romaji pronunciation"}
        accessibilityState={{ selected: showRomaji }}
        testID="kana-romaji-toggle"
        activeOpacity={0.8}
      >
        <Text style={[s.pronunciationIcon, { color: "#99C7FA" }]}>Aa</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.pronunciationBtn, showHindi && s.hindiBtnActive]}
        onPress={() => setShowHindi((shown) => !shown)}
        accessibilityRole="button"
        accessibilityLabel={showHindi ? "Hide Hindi pronunciation" : "Show Hindi pronunciation"}
        accessibilityState={{ selected: showHindi }}
        testID="kana-hindi-toggle"
        activeOpacity={0.8}
      >
        <Text style={[s.pronunciationIcon, { color: "#F0B3CE" }]}>अ</Text>
      </TouchableOpacity>
    </View>
  );

  const renderChartGuide = () => (
    <View style={s.chartGuide} testID="kana-learning-guide">
      <View style={s.guideHeading}>
        <Ionicons name="library-outline" size={19} color={KANA_COLORS.lavender} />
        <Text style={s.guideTitle}>Your {kanaType} chart</Text>
      </View>
      <Text style={s.guideDescription} testID="kana-total-count">
        {kanaList.length} learning entries in the full chart. Combinations are sound pairs, not
        extra basic letters.
      </Text>
      <View style={s.chartStats}>
        {[
          { label: "Basic", count: breakdown.basic, color: KANA_COLORS.lavender },
          { label: "With marks", count: breakdown.marked, color: KANA_COLORS.gold },
          { label: "Combinations", count: breakdown.combinations, color: KANA_COLORS.teal },
          ...(breakdown.loanwords
            ? [{ label: "Loanword sounds", count: breakdown.loanwords, color: "#99C7FA" }]
            : []),
        ].map((stat) => (
          <View key={stat.label} style={[s.chartStat, { borderColor: stat.color + "35" }]}>
            <Text style={[s.chartStatCount, { color: stat.color }]}>{stat.count}</Text>
            <Text style={s.chartStatLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
      <Text style={s.guideTitle}>A simple way to learn</Text>
      {[
        {
          title: "Start with one row",
          body: "Learn the vowels first, then one row at a time. Use the row filters to focus on a small set.",
        },
        {
          title: "Listen, trace, then recall",
          body: "Open a character, listen and follow the strokes. Write it from memory, then use Replay to check. Hide Aa / अ when you are ready to recall the sound.",
        },
        {
          title: "Notice marks and small kana",
          body: isHiragana
            ? "Compare は → ば → ぱ. Small ゃ・ゅ・ょ join the previous kana: きゃ is one beat; きや is two. Small っ adds a beat to the next consonant, as in きって."
            : "Compare ハ → バ → パ. Keep the second kana small in pairs such as キャ and ファ. Small ッ adds a beat to the next consonant; ー lengthens a vowel, as in コーヒー.",
        },
        {
          title: "Review in short sessions",
          body: "Start with 10 practice questions, then try 15 or 20. Revisit the characters you miss and say each sound aloud.",
        },
      ].map((step, index) => (
        <View key={step.title} style={s.guideStep}>
          <View style={s.guideStepNumber}>
            <Text style={s.guideStepNumberText}>{index + 1}</Text>
          </View>
          <View style={s.guideStepContent}>
            <Text style={s.guideStepTitle}>{step.title}</Text>
            <Text style={s.guideStepText}>{step.body}</Text>
          </View>
        </View>
      ))}
      <Text style={s.guideNote}>
        Hindi is an approximate sound guide. Use Listen to hear the Japanese pronunciation.
      </Text>
    </View>
  );

  // ═══════════════════ GRID MODE ═══════════════════
  const renderGrid = () => (
    <View style={[s.chartContainer, { maxWidth: chartWidth }]}>
      <LinearGradient
        colors={isHiragana ? ["#292744", "#172E40"] : ["#183B43", "#1A2943"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.chartHeaderPanel}
        testID="kana-chart-header"
      >
        <View style={s.chartHeader}>
          <View style={s.chartHeading}>
            <Text style={s.chartTitle}>{isHiragana ? "Hiragana" : "Katakana"}</Text>
            {refreshing && !loading && (
              <ActivityIndicator
                size="small"
                color={KANA_COLORS.teal}
                accessibilityLabel="Refreshing character chart"
              />
            )}
          </View>
          <TouchableOpacity
            style={[s.chartQuizBtn, (loading || filtered.length === 0) && s.disabled]}
            onPress={startQuiz}
            disabled={loading || filtered.length === 0}
            accessibilityRole="button"
            accessibilityLabel="Start kana quiz"
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={17} color="#fff" />
            <Text style={s.chartQuizText}>Practice</Text>
          </TouchableOpacity>
        </View>

        <View style={s.chartControls}>
          <View style={s.toggleRow}>
            {(["hiragana", "katakana"] as const).map((type) => {
              const active = kanaType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    s.toggleBtn,
                    active && (isHiragana ? s.toggleHiraganaActive : s.toggleKatakanaActive),
                  ]}
                  onPress={() => setKanaType(type)}
                  accessibilityRole="tab"
                  accessibilityLabel={type === "hiragana" ? "Hiragana" : "Katakana"}
                  accessibilityState={{ selected: active }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.toggleKana, active && s.toggleKanaActive]}>
                    {type === "hiragana" ? "ひ" : "カ"}
                  </Text>
                  <Text style={[s.toggleLabel, active && s.toggleLabelActive]}>
                    {type === "hiragana" ? "Hiragana" : "Katakana"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {renderPronunciationControls()}
        </View>

        <ScrollView
          key={kanaType}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipRow}
          style={s.chipScroll}
        >
          {groupNames.map((group) => {
            const active = group === activeGroup;
            const color = GROUP_COLORS[group] || Colors.primary[400];
            return (
              <TouchableOpacity
                key={group}
                style={[s.chip, active && { backgroundColor: color + "25", borderColor: color }]}
                onPress={() => setActiveGroup(group)}
                accessibilityRole="button"
                accessibilityLabel={
                  group === "All" ? "Show all kana" : "Show " + formatGroup(group) + " group"
                }
                accessibilityState={{ selected: active }}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, active && { color }]}>{formatGroup(group)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </LinearGradient>
      {servedFrom !== null && offline && (
        <OfflineNotice savedAt={servedFrom} onRetry={() => void fetchKana()} />
      )}
      {servedFrom !== null && !offline && (
        <TouchableOpacity
          onPress={() => void fetchKana()}
          accessibilityRole="button"
          style={s.savedNotice}
        >
          <Text style={s.chartMeta}>Showing saved characters. Tap to retry the refresh.</Text>
        </TouchableOpacity>
      )}
      {!loading && !refreshing && !loadFailed && inventory.missing.length > 0 && (
        <Text style={s.inventoryNotice}>
          {inventory.missing.length} chart entries are unavailable. Connect and refresh for the
          complete chart.
        </Text>
      )}

      {loading ? (
        <View style={s.centerBox}>
          <ActivityIndicator color={Colors.primary[400]} size="large" />
          <Text style={s.loadingText}>Loading {kanaType}...</Text>
        </View>
      ) : loadFailed ? (
        <LoadError
          onRetry={() => void fetchKana()}
          offline={offline}
          message={"We could not load " + kanaType + "."}
        />
      ) : (
        <SectionList
          testID="kana-character-list"
          key={kanaType + "-" + activeGroup}
          sections={groupedKana}
          style={s.flex}
          contentContainerStyle={s.gridScroll}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          extraData={showRomaji + "-" + showHindi + "-" + chartWidth}
          keyExtractor={(row) => String(row[0].id)}
          renderSectionHeader={({ section }) => (
            <View style={s.groupHeader}>
              <View
                style={[
                  s.groupDot,
                  { backgroundColor: GROUP_COLORS[section.name] || Colors.primary[400] },
                ]}
              />
              <Text style={s.groupTitle}>{formatGroup(section.name)}</Text>
              <View style={s.groupLine} />
              <Text style={s.groupCount}>{section.count}</Text>
            </View>
          )}
          renderItem={({ item: row, section }) => {
            const cardWidth =
              (chartWidth - GRID_PAD * 2 - CARD_GAP * (section.columns - 1)) / section.columns;
            return (
              <View style={s.gridRow}>
                {row.map((kana) => (
                  <TouchableOpacity
                    key={kana.id}
                    style={[
                      s.kanaCard,
                      {
                        width: cardWidth,
                        minHeight: Math.max(78, cardWidth + (showRomaji && showHindi ? 28 : 8)),
                      },
                      kana.is_dakuten && s.kanaCardDakuten,
                      kana.is_combo && s.kanaCardCombo,
                    ]}
                    onPress={() => openDetail(kana, filteredIndices.get(kana.id) ?? 0)}
                    accessibilityRole="button"
                    accessibilityLabel={
                      "Open " +
                      kana.character +
                      (showRomaji ? ", " + kana.romaji : "") +
                      (showHindi && kana.romaji_hindi ? ", " + kana.romaji_hindi : "")
                    }
                    accessibilityHint="View stroke order and play pronunciation"
                    testID={"kana-card-" + kana.id}
                    activeOpacity={0.7}
                  >
                    <Text style={s.kanaChar}>{kana.character}</Text>
                    {showRomaji && (
                      <Text style={s.kanaRomaji} numberOfLines={1}>
                        {kana.romaji}
                      </Text>
                    )}
                    {showHindi && kana.romaji_hindi && (
                      <Text style={s.kanaHindi} numberOfLines={1}>
                        {kana.romaji_hindi}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            );
          }}
          ListFooterComponent={renderChartGuide()}
        />
      )}
    </View>
  );

  // ═══════════════════ DETAIL MODE ═══════════════════
  const renderDetail = () => {
    if (!selectedKana) return null;
    const total = filtered.length;
    const canPrev = selectedIndex > 0;
    const canNext = selectedIndex < total - 1;
    const color = GROUP_COLORS[selectedKana.group_name] || Colors.primary[400];
    const info = kanaLearningInfo(selectedKana);
    const strokeCount = loadedStrokes?.id === selectedKana.id ? loadedStrokes.count : null;

    return (
      <View style={[s.detailFrame, { maxWidth: chartWidth }]}>
        {/* Stays in reach even while the learner reads the notes below. */}
        <LinearGradient
          colors={["#292744", "#172E40"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.detailTopBar}
        >
          <TouchableOpacity
            onPress={closeOverlay}
            style={s.backBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to character chart"
          >
            <Ionicons name="arrow-back" size={21} color={KANA_COLORS.text} />
          </TouchableOpacity>
          <View style={s.detailHeading}>
            <Text style={s.detailScript}>{isHiragana ? "Hiragana" : "Katakana"}</Text>
            <Text style={s.detailCounter} testID="kana-detail-position">
              {selectedIndex + 1} of {total}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.quickNavBtn, !canPrev && s.navBtnDisabled]}
            onPress={() => navigateKana(-1)}
            disabled={!canPrev}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Previous character"
            accessibilityState={{ disabled: !canPrev }}
            testID="kana-previous"
          >
            <Ionicons name="chevron-back" size={22} color={KANA_COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.quickNavBtn, s.quickNavNext, !canNext && s.navBtnDisabled]}
            onPress={() => navigateKana(1)}
            disabled={!canNext}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Next character"
            accessibilityState={{ disabled: !canNext }}
            testID="kana-next"
          >
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <Animated.ScrollView
          key={selectedKana.id}
          style={[s.flex, { opacity: cardAnim }]}
          contentContainerStyle={s.detailScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.detailCharCard}>
            <LinearGradient
              colors={[color + "18", "#172F3B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.detailCharGlow}
              pointerEvents="none"
            />
            <View style={s.characterToolbar}>
              <View>
                <Text style={s.stageTitle}>STROKE ORDER</Text>
                <Text style={s.stageSubtitle}>
                  {strokeCount !== null
                    ? `${strokeCount} stroke${strokeCount === 1 ? "" : "s"} · `
                    : ""}
                  {formatGroup(selectedKana.group_name)}
                </Text>
              </View>
              <TouchableOpacity
                style={s.replayBtn}
                onPress={() => setStrokeReplay((value) => value + 1)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Replay stroke animation"
                accessibilityHint="Restart the strokes from the beginning"
                testID="kana-replay"
              >
                <Ionicons name="refresh-outline" size={18} color={Colors.primary[300]} />
                <Text style={s.replayText}>Replay</Text>
              </TouchableOpacity>
            </View>
            <View style={s.detailGridBox}>
              <StrokeWriter
                key={selectedKana.id + ":" + strokeReplay}
                character={selectedKana.character}
                size={selectedKana.is_combo ? Math.min(240, chartWidth - 82) : 168}
                color={KANA_COLORS.text}
                outlineColor={color + "30"}
                isDrawing
                showUnavailableMessage
                onLoad={onStrokesLoaded}
              />
            </View>
            {showRomaji && <Text style={[s.detailRomaji, { color }]}>{selectedKana.romaji}</Text>}
            {showHindi && selectedKana.romaji_hindi && (
              <Text style={[s.detailRomajiSub, { color }]}>{selectedKana.romaji_hindi}</Text>
            )}
            <View style={s.detailActions}>
              <TouchableOpacity
                style={[s.detailActionBtn, isSpeaking && { backgroundColor: "#257B7C" }]}
                onPress={() => speakKana(selectedKana)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Play character pronunciation"
                testID="kana-audio"
              >
                <Ionicons
                  name={isSpeaking ? "volume-high" : "volume-medium-outline"}
                  size={20}
                  color={isSpeaking ? "#fff" : KANA_COLORS.teal}
                />
                <Text style={[s.detailActionText, isSpeaking && { color: "#fff" }]}>
                  {isSpeaking ? "Playing…" : "Listen"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.detailActionBtnSecondary}
                onPress={startQuiz}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Practice kana recognition"
                accessibilityHint="Start a reading quiz from this character group"
                testID="kana-practice"
              >
                <Ionicons name="create-outline" size={20} color={KANA_COLORS.lavender} />
                <Text style={s.detailActionTextSecondary}>Practice</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.detailPronunciation}>{renderPronunciationControls()}</View>

          <View style={s.card}>
            <View style={s.cardHeader}>
              <Ionicons name="bulb-outline" size={18} color={color} />
              <Text style={s.cardTitle}>Learning tips</Text>
              <View style={[s.badge, { backgroundColor: color + "18", borderColor: color + "40" }]}>
                <Text style={[s.badgeText, { color }]}>{info.kind}</Text>
              </View>
            </View>
            {info.composition && <Text style={s.compositionText}>{info.composition}</Text>}
            {info.tips.map((tip) => (
              <Text key={tip} style={s.learningTip}>
                {tip}
              </Text>
            ))}
            {!selectedKana.is_combo && !info.mark && selectedKana.stroke_hint && (
              <View style={s.writingNotes}>
                <Text style={s.writingNotesTitle}>Writing notes</Text>
                <Text style={s.learningTip}>
                  {selectedKana.stroke_hint.replace(/,\s*(?=\d+→)/g, "\n")}
                </Text>
              </View>
            )}
            <Text style={s.practiceTip}>
              Try it: watch once, write from memory, then replay to check.
            </Text>
          </View>

          <View style={s.card}>
            <View style={s.cardHeader}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.accent[400]} />
              <Text style={s.cardTitle}>Character details</Text>
            </View>
            {[
              { label: "Character", value: selectedKana.character },
              ...(info.counterpart
                ? [{ label: info.counterpartLabel, value: info.counterpart }]
                : []),
              ...(showRomaji ? [{ label: "Romaji", value: selectedKana.romaji }] : []),
              ...(showHindi && selectedKana.romaji_hindi
                ? [{ label: "Hindi", value: selectedKana.romaji_hindi }]
                : []),
              { label: "Type", value: info.kind },
              ...(info.mark && selectedKana.is_combo
                ? [{ label: "Sound mark", value: info.mark }]
                : []),
              { label: "Group", value: formatGroup(selectedKana.group_name) },
              ...(strokeCount !== null ? [{ label: "Strokes", value: String(strokeCount) }] : []),
            ].map((item, index, items) => (
              <View
                key={item.label}
                style={[s.infoRow, index === items.length - 1 && { borderBottomWidth: 0 }]}
              >
                <Text style={s.infoLabel}>{item.label}</Text>
                <Text style={s.infoValue}>{item.value}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={s.saveCharacterBtn}
              onPress={openAddToList}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Add character to a practice list"
            >
              <Ionicons name="bookmark-outline" size={18} color={Colors.primary[300]} />
              <Text style={s.detailActionText}>Add to practice list</Text>
            </TouchableOpacity>
          </View>
        </Animated.ScrollView>
      </View>
    );
  };
  // ═══════════════════ RENDER ═══════════════════
  return (
    /*
     * No paddingBottom. The tab bar is a laid-out bar, not an overlay, and its
     * own style already adds the bottom safe-area inset — so padding the screen
     * by it again reserved that height twice and left a dead band of background
     * above the tab bar, covering the last row of cards. It sat on every mode
     * because this container wraps the grid, the detail view and the quiz.
     */
    <View style={[s.container, { paddingTop: insets.top }]}>
      {mode === "grid" && renderGrid()}
      {mode === "detail" && renderDetail()}
      {mode === "quiz" && (
        <KanaPractice
          key={session?.user.id ?? "guest"}
          kana={kanaList}
          script={kanaType}
          initialGroup={activeGroup}
          groupLabel={formatGroup(activeGroup)}
          onClose={() => setMode(practiceReturnMode.current)}
        />
      )}

      {selectedKana && (
        <AddToListModal
          visible={showAddListModal}
          onClose={() => setShowAddListModal(false)}
          itemType="kana"
          itemId={selectedKana.id}
          itemTitle={selectedKana.character}
          studyItem={{
            listItemId: "pending",
            itemType: "kana",
            itemId: String(selectedKana.id),
            front: selectedKana.character.trim(),
            back: selectedKana.romaji.trim(),
            correctAnswer: selectedKana.romaji.trim(),
            audioText: selectedKana.character.trim(),
            masteryScore: 0,
            lastReviewed: null,
          }}
        />
      )}

      <AuthPromptModal
        visible={showListAuthPrompt}
        feature="practice lists"
        redirectTo="/(tabs)/writing"
        description="Sign in to add kana to custom lists and sync your writing practice progress."
        onClose={() => setShowListAuthPrompt(false)}
      />
    </View>
  );
}

// ════════════════════════ STYLES ════════════════════════

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: KANA_COLORS.bg },
  flex: { flex: 1 },
  chartContainer: { flex: 1, width: "100%", alignSelf: "center" },
  chartHeaderPanel: {
    flexShrink: 0,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderBottomWidth: 1,
    borderColor: "#395066",
    paddingBottom: 6,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: GRID_PAD,
    paddingTop: 8,
    paddingBottom: 8,
  },
  chartHeading: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  chartTitle: { color: KANA_COLORS.text, fontSize: 25, fontWeight: "800", letterSpacing: -0.5 },
  chartQuizBtn: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: "#7058B9",
    borderWidth: 1,
    borderColor: "#9780D4",
  },
  chartQuizText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  disabled: { opacity: 0.4 },
  chartControls: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: GRID_PAD,
    gap: 8,
    marginBottom: 6,
  },
  pronunciationButtons: { flexDirection: "row", gap: 6, flexShrink: 0 },
  pronunciationBtn: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: KANA_COLORS.border,
    borderRadius: 12,
    backgroundColor: "#101F32",
  },
  romajiBtnActive: {
    backgroundColor: "#304765",
    borderColor: "#7FAAD9",
  },
  hindiBtnActive: { backgroundColor: "#48374D", borderColor: "#C991AE" },
  pronunciationIcon: { color: KANA_COLORS.textSecondary, fontWeight: "700", fontSize: 17 },
  detailPronunciation: { paddingHorizontal: GRID_PAD, marginBottom: 16 },
  chartMeta: { flex: 1, color: KANA_COLORS.textSecondary, fontSize: 11, lineHeight: 17 },
  savedNotice: { paddingHorizontal: GRID_PAD, paddingBottom: 10 },
  inventoryNotice: {
    color: Colors.gold[300],
    fontSize: 11,
    paddingHorizontal: GRID_PAD,
    paddingBottom: 10,
  },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: Spacing.md },
  loadingText: { color: KANA_COLORS.textMuted, fontSize: FontSize.sm, marginTop: Spacing.sm },

  // ── Hero ──
  heroBanner: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  heroGradient: {
    flexDirection: "row",
    padding: Spacing.xl,
    alignItems: "center",
    position: "relative",
    minHeight: 100,
  },
  heroLeft: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.lg,
  },
  heroKana: { fontSize: 36, color: "#fff", fontWeight: FontWeight.bold },
  heroRight: { flex: 1 },
  heroTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: "#fff", marginBottom: 2 },
  heroSubtitle: { fontSize: FontSize.sm, color: "rgba(255,255,255,0.7)", marginBottom: Spacing.md },
  heroActions: { flexDirection: "row", gap: Spacing.sm },
  heroQuizBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: BorderRadius.md,
  },
  heroQuizBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: "#fff" },
  heroDecorative: {
    position: "absolute",
    right: 12,
    bottom: -8,
    fontSize: 50,
    color: "rgba(255,255,255,0.05)",
    fontWeight: FontWeight.bold,
  },

  // ── Toggle ──
  toggleRow: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 44,
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: "#101F32",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: KANA_COLORS.border,
  },
  toggleHiraganaActive: { backgroundColor: "#443E68", borderColor: "#A497D2" },
  toggleKatakanaActive: { backgroundColor: "#23525A", borderColor: "#78BDB5" },
  toggleKana: { fontSize: 16, color: KANA_COLORS.textMuted },
  toggleKanaActive: { color: "#fff" },
  toggleLabel: { fontSize: 12, fontWeight: FontWeight.bold, color: KANA_COLORS.textMuted },
  toggleLabelActive: { color: "#fff" },

  // ── Filter Chips ──
  /*
   * No maxHeight. It used to be capped at 44 while the content measures 40 —
   * a 32px chip plus 4px padding top and bottom — so there were four pixels of
   * slack. Anything that pushed past it (a larger system font scale, a taller
   * line box for the Japanese row labels) overflowed, and a React Native View
   * on Android does not clip by default: the excess drew on top of the script
   * toggle above and the first group heading below instead of being hidden.
   *
   * flexShrink: 0 stops the surrounding flex column squeezing the row when the
   * grid below is long.
   */
  chipScroll: { flexGrow: 0, flexShrink: 0 },
  chipRow: { paddingHorizontal: GRID_PAD, paddingVertical: 2, gap: 6, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    minHeight: 44,
    paddingVertical: 8,
    backgroundColor: "#142439",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: KANA_COLORS.border,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { color: KANA_COLORS.textSecondary, fontSize: 12, fontWeight: FontWeight.bold },

  // ── Grid ──
  gridScroll: { paddingHorizontal: GRID_PAD, paddingBottom: 32 },
  groupSection: { marginBottom: Spacing.xl },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: 2,
  },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: KANA_COLORS.textSecondary,
  },
  groupLine: { flex: 1, height: 1, backgroundColor: KANA_COLORS.border },
  groupCount: {
    fontSize: FontSize.xs,
    color: KANA_COLORS.textMuted,
    fontWeight: FontWeight.semibold,
  },
  gridRow: { flexDirection: "row", gap: CARD_GAP, marginBottom: CARD_GAP },
  kanaCard: {
    paddingVertical: 12,
    backgroundColor: KANA_COLORS.card,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: KANA_COLORS.border,
    position: "relative",
  },
  kanaCardDakuten: { borderColor: "#EAC88F45", backgroundColor: "#292A33" },
  kanaCardCombo: { borderColor: "#8CDECF45", backgroundColor: "#162D36" },
  kanaStrokeCount: {
    position: "absolute",
    top: 3,
    right: 4,
    fontSize: 8,
    color: KANA_COLORS.textMuted,
    fontWeight: FontWeight.semibold,
  },
  kanaChar: { fontSize: 28, fontWeight: FontWeight.bold, color: KANA_COLORS.text },
  kanaRomaji: { fontSize: 12, color: "#99C7FA", marginTop: 4 },
  kanaHindi: { fontSize: 12, color: "#F0B3CE", marginTop: 3 },
  chartGuide: {
    marginTop: 24,
    padding: 16,
    gap: 14,
    backgroundColor: KANA_COLORS.card,
    borderWidth: 1,
    borderColor: KANA_COLORS.border,
    borderRadius: 20,
  },
  guideHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  guideTitle: { flexShrink: 1, fontSize: 16, fontWeight: "700", color: KANA_COLORS.text },
  guideDescription: { fontSize: 12, lineHeight: 19, color: KANA_COLORS.textSecondary },
  chartStats: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chartStat: {
    flexGrow: 1,
    flexBasis: "45%",
    padding: 10,
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "#122033",
  },
  chartStatCount: { fontSize: 20, fontWeight: "700" },
  chartStatLabel: { fontSize: 11, color: KANA_COLORS.textSecondary },
  guideStep: { flexDirection: "row", gap: 10 },
  guideStepNumber: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#293F4F",
  },
  guideStepNumberText: { color: KANA_COLORS.teal, fontSize: 12, fontWeight: "700" },
  guideStepContent: { flex: 1, gap: 4 },
  guideStepTitle: { color: KANA_COLORS.text, fontSize: 13, fontWeight: "600" },
  guideStepText: { color: KANA_COLORS.textSecondary, fontSize: 12, lineHeight: 20 },
  guideNote: {
    color: KANA_COLORS.gold,
    fontSize: 12,
    lineHeight: 19,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: KANA_COLORS.border,
  },
  footerText: {
    textAlign: "center",
    color: KANA_COLORS.textMuted,
    fontSize: 12,
    marginTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },

  // ── Detail Mode ──
  detailFrame: { flex: 1, width: "100%", alignSelf: "center" },
  detailScroll: { paddingTop: 16, paddingBottom: 40 },
  detailTopBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#203047",
    borderWidth: 1,
    borderColor: KANA_COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  detailHeading: { flex: 1, gap: 3 },
  detailScript: { color: KANA_COLORS.text, fontSize: 16, fontWeight: "700" },
  quickNavBtn: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: KANA_COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: KANA_COLORS.border,
  },
  quickNavNext: { backgroundColor: "#2A626D", borderColor: "#569A9E" },
  characterToolbar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
  stageTitle: {
    fontSize: 10,
    letterSpacing: 1.1,
    fontWeight: "700",
    color: KANA_COLORS.textSecondary,
  },
  stageSubtitle: { color: KANA_COLORS.textSecondary, fontSize: 12, marginTop: 5 },
  replayBtn: {
    minHeight: 44,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 12,
    backgroundColor: KANA_COLORS.surface,
  },
  replayText: { color: KANA_COLORS.lavender, fontSize: 12, fontWeight: "600" },
  compositionText: { color: KANA_COLORS.text, fontSize: 24, fontWeight: "600", marginBottom: 12 },
  learningTip: { color: KANA_COLORS.textSecondary, fontSize: 13, lineHeight: 21, marginBottom: 10 },
  practiceTip: { color: KANA_COLORS.teal, fontSize: 12, lineHeight: 19, marginTop: 2 },
  writingNotes: {
    marginTop: 2,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: KANA_COLORS.border,
  },
  writingNotesTitle: { color: KANA_COLORS.text, fontSize: 12, fontWeight: "600", marginBottom: 6 },
  saveCharacterBtn: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: KANA_COLORS.surface,
    borderRadius: 12,
    marginTop: 12,
  },
  detailCounter: {
    fontSize: FontSize.sm,
    color: KANA_COLORS.textMuted,
    fontWeight: FontWeight.semibold,
  },
  topQuizBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },

  detailCharCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: KANA_COLORS.card,
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: KANA_COLORS.border,
    overflow: "hidden",
  },
  detailCharGlow: {
    ...StyleSheet.absoluteFill,
    borderRadius: BorderRadius["2xl"],
  },
  detailGridBox: {
    backgroundColor: KANA_COLORS.bg + "CC",
    borderRadius: BorderRadius.xl,
    padding: 4,
    borderWidth: 1.5,
    borderColor: KANA_COLORS.border,
    marginBottom: 8,
  },
  detailRomaji: { fontSize: 32, fontWeight: FontWeight.extrabold, marginBottom: 2 },
  detailRomajiSub: {
    fontSize: FontSize.sm,
    color: KANA_COLORS.textMuted,
    marginBottom: Spacing.sm,
  },
  detailActions: {
    width: "100%",
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 0,
  },
  detailActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: "#164B55",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: "#38747D",
  },
  detailActionBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: KANA_COLORS.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: KANA_COLORS.border,
  },
  detailActionText: { color: KANA_COLORS.teal, fontWeight: FontWeight.bold },
  detailActionTextSecondary: { color: KANA_COLORS.lavender, fontWeight: FontWeight.bold },

  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: Spacing.xl },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: FontWeight.bold },

  // ── Cards ──
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: KANA_COLORS.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: KANA_COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: KANA_COLORS.text,
    flex: 1,
  },

  strokeCountBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  strokeCountText: { fontSize: 11, fontWeight: FontWeight.bold },

  strokeDotsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  strokeDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  strokeDotNum: { color: "#fff", fontSize: 13, fontWeight: FontWeight.extrabold },

  strokeHintList: { gap: Spacing.md },
  strokeHintRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  strokeHintNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  strokeHintNumText: { color: "#fff", fontSize: 10, fontWeight: FontWeight.bold },
  strokeHintText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: KANA_COLORS.textSecondary,
    lineHeight: 20,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: KANA_COLORS.border,
  },
  infoLabel: { fontSize: FontSize.sm, color: KANA_COLORS.textMuted, fontWeight: FontWeight.medium },
  infoValue: { fontSize: FontSize.sm, color: KANA_COLORS.text, fontWeight: FontWeight.semibold },

  // ── Detail Nav ──
  detailNav: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  navBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.lg,
    backgroundColor: KANA_COLORS.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: KANA_COLORS.border,
  },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: KANA_COLORS.text },
  navBtnPrimary: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  navBtnPrimaryText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: "#fff" },
});
