import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import Svg, { Text as SvgText, Line, Rect } from "react-native-svg";
import * as Speech from "expo-speech";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import { AddToListModal } from "@/components/AddToListModal";
import { AuthPromptModal } from "@/components/AuthPromptModal";
import StrokeWriter from "@/components/StrokeWriter";
import { useAuth } from "@/lib/auth";
import type { Kana } from "@japangolearn/database";

// ─── Types ───
type ViewMode = "grid" | "detail" | "quiz";

// ─── Constants ───
const { width: SCREEN_W } = Dimensions.get("window");
const GRID_COLS = 5;
const CARD_GAP = 6;
const GRID_PAD = 16;
const CARD_SIZE = Math.floor((SCREEN_W - GRID_PAD * 2 - CARD_GAP * (GRID_COLS - 1)) / GRID_COLS);

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
};

const STROKE_COLORS = [
  "#A78BFA",
  "#60A5FA",
  "#34D399",
  "#F472B6",
  "#FBBF24",
  "#FB7185",
  "#22D3EE",
  "#E879F9",
];

function formatGroup(group: string): string {
  return GROUP_LABELS[group]?.label || group;
}

// ─── Main Component ───
export default function WritingScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [kanaList, setKanaList] = useState<Kana[]>([]);
  const [kanaType, setKanaType] = useState<"hiragana" | "katakana">("hiragana");
  const [mode, setMode] = useState<ViewMode>("grid");
  // Detail state
  const [selectedKana, setSelectedKana] = useState<Kana | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Custom List State
  const [showAddListModal, setShowAddListModal] = useState(false);
  const [showListAuthPrompt, setShowListAuthPrompt] = useState(false);
  const [showHindi, setShowHindi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeGroup, setActiveGroup] = useState("All");

  // Quiz state
  const [quizPool, setQuizPool] = useState<Kana[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizDone, setQuizDone] = useState(false);

  // Animations
  const cardAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isHiragana = kanaType === "hiragana";

  useEffect(() => {
    fetchKana();
    setSelectedKana(null);
    setActiveGroup("All");
    setMode("grid");
  }, [kanaType]);

  const fetchKana = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("kana")
      .select("*")
      .eq("type", kanaType)
      .order("sort_order");
    if (data) setKanaList(data);
    setLoading(false);
  };

  // Filtered list
  const filtered = useMemo(() => {
    if (activeGroup === "All") return kanaList;
    return kanaList.filter((k) => k.group_name === activeGroup);
  }, [kanaList, activeGroup]);

  const groupNames = useMemo(() => {
    return ["All", ...Array.from(new Set(kanaList.map((k) => k.group_name)))];
  }, [kanaList]);

  // Groups for sectioned grid
  const groupedKana = useMemo(() => {
    const groups: { name: string; data: Kana[] }[] = [];
    const seen = new Set<string>();
    for (const k of filtered) {
      if (!seen.has(k.group_name)) {
        seen.add(k.group_name);
        groups.push({
          name: k.group_name,
          data: filtered.filter((x) => x.group_name === k.group_name),
        });
      }
    }
    return groups;
  }, [filtered]);

  // ─── Helpers ───
  const speakKana = useCallback((kana: Kana) => {
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(kana.character, {
      language: "ja-JP",
      pitch: 1.1,
      rate: 0.7,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, []);

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

  // ─── Quiz Logic ───
  const startQuiz = useCallback(() => {
    const pool = [...filtered]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(20, filtered.length));
    setQuizPool(pool);
    setQuizIndex(0);
    setQuizScore({ correct: 0, total: 0 });
    setQuizAnswer(null);
    setQuizDone(false);
    setupQuizQuestion(pool, 0);
    setMode("quiz");
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [filtered, fadeAnim]);

  const setupQuizQuestion = (pool: Kana[], idx: number) => {
    if (idx >= pool.length) {
      setQuizDone(true);
      return;
    }
    const target = pool[idx];
    const others = kanaList.filter((k) => k.id !== target.id);
    const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [...shuffled.map((k) => k.romaji), target.romaji].sort(() => Math.random() - 0.5);
    setQuizOptions(opts);
    setQuizAnswer(null);
  };

  const handleQuizAnswer = useCallback(
    (answer: string) => {
      if (quizAnswer) return;
      setQuizAnswer(answer);
      const current = quizPool[quizIndex];
      const correct = answer === current?.romaji;
      setQuizScore((s) => ({
        correct: s.correct + (correct ? 1 : 0),
        total: s.total + 1,
      }));
      if (current) speakKana(current);

      setTimeout(() => {
        const next = quizIndex + 1;
        setQuizIndex(next);
        if (next >= quizPool.length) {
          setQuizDone(true);
        } else {
          setupQuizQuestion(quizPool, next);
        }
      }, 1200);
    },
    [quizAnswer, quizPool, quizIndex, speakKana]
  );

  // ═══════════════════ GRID MODE ═══════════════════
  const renderGrid = () => (
    <View style={s.flex}>
      {/* Hero Banner */}
      <View style={s.heroBanner}>
        <LinearGradient
          colors={[Colors.primary[700], Colors.primary[900]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroGradient}
        >
          <View style={s.heroLeft}>
            <Text style={s.heroKana}>{isHiragana ? "あ" : "ア"}</Text>
          </View>
          <View style={s.heroRight}>
            <Text style={s.heroTitle}>{isHiragana ? "Hiragana" : "Katakana"}</Text>
            <Text style={s.heroSubtitle}>{filtered.length} characters to master</Text>
            <View style={s.heroActions}>
              <TouchableOpacity style={s.heroQuizBtn} onPress={startQuiz} activeOpacity={0.8}>
                <Ionicons name="help-circle" size={16} color="#fff" />
                <Text style={s.heroQuizBtnText}>Quiz Me</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Decorative */}
          <Text style={s.heroDecorative}>{isHiragana ? "ひらがな" : "カタカナ"}</Text>
        </LinearGradient>
      </View>

      {/* Type Toggle */}
      <View style={s.toggleRow}>
        <TouchableOpacity
          style={[s.toggleBtn, isHiragana && s.toggleActive]}
          onPress={() => setKanaType("hiragana")}
          activeOpacity={0.8}
        >
          <Text style={[s.toggleKana, isHiragana && s.toggleKanaActive]}>ひ</Text>
          <Text style={[s.toggleLabel, isHiragana && s.toggleLabelActive]}>Hiragana</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.toggleBtn, !isHiragana && s.toggleActive]}
          onPress={() => setKanaType("katakana")}
          activeOpacity={0.8}
        >
          <Text style={[s.toggleKana, !isHiragana && s.toggleKanaActive]}>カ</Text>
          <Text style={[s.toggleLabel, !isHiragana && s.toggleLabelActive]}>Katakana</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.hindiBtn, showHindi && s.hindiBtnActive]}
          onPress={() => setShowHindi(!showHindi)}
          activeOpacity={0.8}
        >
          <Text style={[s.hindiBtnText, showHindi && { color: "#fff" }]}>हिं</Text>
        </TouchableOpacity>
      </View>

      {/* Group Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipRow}
        style={s.chipScroll}
      >
        {groupNames.map((g) => {
          const active = g === activeGroup;
          const color = GROUP_COLORS[g] || Colors.primary[400];
          return (
            <TouchableOpacity
              key={g}
              style={[s.chip, active && { backgroundColor: color + "25", borderColor: color }]}
              onPress={() => setActiveGroup(g)}
              activeOpacity={0.7}
            >
              {g !== "All" && (
                <View
                  style={[s.chipDot, { backgroundColor: active ? color : Colors.dark.textMuted }]}
                />
              )}
              <Text style={[s.chipText, active && { color }]}>{formatGroup(g)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Sectioned Grid */}
      {loading ? (
        <View style={s.centerBox}>
          <ActivityIndicator color={Colors.primary[400]} size="large" />
          <Text style={s.loadingText}>Loading {kanaType}...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.gridScroll}>
          {groupedKana.map((group) => {
            const color = GROUP_COLORS[group.name] || Colors.primary[400];
            return (
              <View key={group.name} style={s.groupSection}>
                {/* Group header */}
                <View style={s.groupHeader}>
                  <View style={[s.groupDot, { backgroundColor: color }]} />
                  <Text style={s.groupTitle}>{formatGroup(group.name)}</Text>
                  <View style={[s.groupLine, { backgroundColor: color + "30" }]} />
                  <Text style={s.groupCount}>{group.data.length}</Text>
                </View>

                {/* Cards */}
                <View style={s.gridRow}>
                  {group.data.map((kana) => {
                    const globalIdx = filtered.findIndex((k) => k.id === kana.id);
                    return (
                      <TouchableOpacity
                        key={kana.id}
                        style={[
                          s.kanaCard,
                          kana.is_dakuten && s.kanaCardDakuten,
                          kana.is_combo && s.kanaCardCombo,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => openDetail(kana, globalIdx)}
                      >
                        <Text style={s.kanaStrokeCount}>{kana.stroke_count}画</Text>
                        <Text style={s.kanaChar}>{kana.character}</Text>
                        <Text style={s.kanaRomaji} numberOfLines={1}>
                          {showHindi && kana.romaji_hindi ? kana.romaji_hindi : kana.romaji}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}

          <Text style={s.footerText}>
            {isHiragana ? "ひらがな" : "カタカナ"} · {kanaList.length} characters
          </Text>
        </ScrollView>
      )}
    </View>
  );

  // ═══════════════════ DETAIL MODE ═══════════════════
  const renderDetail = () => {
    if (!selectedKana) return null;
    const total = filtered.length;
    const canPrev = selectedIndex > 0;
    const canNext = selectedIndex < total - 1;
    const strokeHints = selectedKana.stroke_hint?.split(", ") || [];
    const color = GROUP_COLORS[selectedKana.group_name] || Colors.primary[400];

    return (
      <Animated.ScrollView
        style={[s.flex, { opacity: cardAnim }]}
        contentContainerStyle={s.detailScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={s.detailTopBar}>
          <TouchableOpacity onPress={() => setMode("grid")} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={s.detailCounter}>
            {selectedIndex + 1} / {total}
          </Text>
          <TouchableOpacity onPress={startQuiz} style={s.topQuizBtn} activeOpacity={0.7}>
            <Ionicons name="help-circle-outline" size={20} color={Colors.primary[400]} />
          </TouchableOpacity>
        </View>

        {/* Large Character Card */}
        <View style={s.detailCharCard}>
          <LinearGradient colors={[color + "15", "transparent"]} style={s.detailCharGlow} />
          <View style={[s.detailGridBox, { overflow: "hidden" }]}>
            <StrokeWriter
              character={selectedKana.character}
              size={180}
              color={Colors.dark.text}
              outlineColor={color + "30"}
              isDrawing={true}
            />
          </View>

          {/* Romaji */}
          <Text style={[s.detailRomaji, { color }]}>
            {showHindi && selectedKana.romaji_hindi
              ? selectedKana.romaji_hindi
              : selectedKana.romaji}
          </Text>
          {showHindi && selectedKana.romaji_hindi && (
            <Text style={s.detailRomajiSub}>{selectedKana.romaji}</Text>
          )}

          {/* Action buttons */}
          <View style={s.detailActions}>
            <TouchableOpacity
              style={[s.detailActionBtn, isSpeaking && { backgroundColor: Colors.primary[600] }]}
              onPress={() => speakKana(selectedKana)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isSpeaking ? "volume-high" : "volume-medium-outline"}
                size={20}
                color={isSpeaking ? "#fff" : Colors.primary[400]}
              />
              <Text style={[s.detailActionText, isSpeaking && { color: "#fff" }]}>
                {isSpeaking ? "Playing..." : "Audio"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.detailActionBtnSecondary}
              onPress={openAddToList}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color={Colors.primary[300]} />
              <Text style={s.detailActionTextSecondary}>Add to List</Text>
            </TouchableOpacity>
          </View>

          {/* Badges */}
          <View style={s.badgeRow}>
            <View style={[s.badge, { backgroundColor: color + "18", borderColor: color + "40" }]}>
              <Text style={[s.badgeText, { color }]}>{formatGroup(selectedKana.group_name)}</Text>
            </View>
            {selectedKana.is_dakuten && (
              <View style={[s.badge, { backgroundColor: "#F59E0B18", borderColor: "#F59E0B40" }]}>
                <Text style={[s.badgeText, { color: "#F59E0B" }]}>Dakuten</Text>
              </View>
            )}
            {selectedKana.is_combo && (
              <View style={[s.badge, { backgroundColor: "#10B98118", borderColor: "#10B98140" }]}>
                <Text style={[s.badgeText, { color: "#10B981" }]}>Combo</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stroke Order Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="pencil" size={16} color={color} />
            <Text style={s.cardTitle}>Stroke Order</Text>
            <View style={[s.strokeCountBadge, { backgroundColor: color + "20" }]}>
              <Text style={[s.strokeCountText, { color }]}>
                {selectedKana.stroke_count} stroke{selectedKana.stroke_count !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>

          {/* Stroke dots */}
          <View style={s.strokeDotsRow}>
            {Array.from({ length: selectedKana.stroke_count }).map((_, i) => (
              <View
                key={i}
                style={[s.strokeDot, { backgroundColor: STROKE_COLORS[i % STROKE_COLORS.length] }]}
              >
                <Text style={s.strokeDotNum}>{i + 1}</Text>
              </View>
            ))}
          </View>

          {/* Stroke hints */}
          {strokeHints.length > 0 && (
            <View style={s.strokeHintList}>
              {strokeHints.map((hint, i) => (
                <View key={i} style={s.strokeHintRow}>
                  <View
                    style={[
                      s.strokeHintNum,
                      { backgroundColor: STROKE_COLORS[i % STROKE_COLORS.length] },
                    ]}
                  >
                    <Text style={s.strokeHintNumText}>{i + 1}</Text>
                  </View>
                  <Text style={s.strokeHintText}>{hint.replace(/^\d+→\s*/, "")}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Character Info Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="information-circle" size={16} color={Colors.accent[400]} />
            <Text style={s.cardTitle}>Details</Text>
          </View>
          {[
            { label: "Character", value: selectedKana.character },
            { label: "Romaji", value: selectedKana.romaji },
            ...(selectedKana.romaji_hindi
              ? [{ label: "Hindi", value: selectedKana.romaji_hindi }]
              : []),
            { label: "Type", value: isHiragana ? "Hiragana" : "Katakana" },
            { label: "Group", value: formatGroup(selectedKana.group_name) },
            { label: "Strokes", value: `${selectedKana.stroke_count}` },
          ].map((item, i, arr) => (
            <View
              key={item.label}
              style={[s.infoRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
            >
              <Text style={s.infoLabel}>{item.label}</Text>
              <Text style={s.infoValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Navigation */}
        <View style={s.detailNav}>
          <TouchableOpacity
            style={[s.navBtn, !canPrev && s.navBtnDisabled]}
            onPress={() => navigateKana(-1)}
            disabled={!canPrev}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={canPrev ? Colors.dark.text : Colors.dark.textMuted}
            />
            <Text style={[s.navBtnText, !canPrev && { color: Colors.dark.textMuted }]}>
              Previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.navBtnPrimary, !canNext && { opacity: 0.4 }]}
            onPress={() => navigateKana(1)}
            disabled={!canNext}
            activeOpacity={0.7}
          >
            <Text style={s.navBtnPrimaryText}>Next</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    );
  };

  // ═══════════════════ QUIZ MODE ═══════════════════
  const renderQuiz = () => {
    // Results screen
    if (quizDone) {
      const pct = quizScore.total > 0 ? Math.round((quizScore.correct / quizScore.total) * 100) : 0;
      const emoji = pct >= 90 ? "🏆" : pct >= 70 ? "🎉" : pct >= 50 ? "💪" : "📚";
      const message =
        pct >= 90
          ? "Outstanding!"
          : pct >= 70
            ? "Great job!"
            : pct >= 50
              ? "Good effort!"
              : "Keep practicing!";

      return (
        <View style={s.quizContainer}>
          <View style={s.quizResultCard}>
            <Text style={s.quizResultEmoji}>{emoji}</Text>
            <Text style={s.quizResultTitle}>Quiz Complete!</Text>
            <Text style={s.quizResultMessage}>{message}</Text>

            {/* Score ring */}
            <View style={s.scoreRing}>
              <Text style={s.scoreRingPct}>{pct}%</Text>
              <Text style={s.scoreRingLabel}>Accuracy</Text>
            </View>

            <View style={s.scoreDetail}>
              <View style={s.scoreItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={s.scoreItemText}>{quizScore.correct} correct</Text>
              </View>
              <View style={s.scoreItem}>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
                <Text style={s.scoreItemText}>{quizScore.total - quizScore.correct} wrong</Text>
              </View>
            </View>

            <View style={s.quizResultActions}>
              <TouchableOpacity style={s.retryBtn} onPress={startQuiz} activeOpacity={0.7}>
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={s.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.backGridBtn}
                onPress={() => setMode("grid")}
                activeOpacity={0.7}
              >
                <Text style={s.backGridBtnText}>Back to Grid</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    // Active question
    const current = quizPool[quizIndex];
    if (!current) return null;
    const progress = quizPool.length > 0 ? (quizIndex + 1) / quizPool.length : 0;

    return (
      <View style={s.quizContainer}>
        {/* Quiz header */}
        <View style={s.quizHeader}>
          <TouchableOpacity onPress={() => setMode("grid")} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={Colors.dark.textMuted} />
          </TouchableOpacity>
          <View style={s.quizProgressWrap}>
            <View style={s.quizProgressBar}>
              <LinearGradient
                colors={[Colors.primary[500], Colors.accent[500]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[s.quizProgressFill, { width: `${Math.round(progress * 100)}%` as any }]}
              />
            </View>
            <Text style={s.quizProgressText}>
              {quizIndex + 1}/{quizPool.length}
            </Text>
          </View>
          <View style={s.quizScoreBadge}>
            <Text style={s.quizScoreText}>
              {quizScore.correct}/{quizScore.total}
            </Text>
          </View>
        </View>

        {/* Question */}
        <View style={s.quizQuestionCard}>
          <Text style={s.quizPrompt}>What is the reading of this character?</Text>

          <TouchableOpacity onPress={() => speakKana(current)} activeOpacity={0.8}>
            <View style={s.quizCharBox}>
              <Text style={s.quizChar}>{current.character}</Text>
            </View>
          </TouchableOpacity>

          <Text style={s.quizTapHint}>Tap character to hear pronunciation</Text>
        </View>

        {/* Options */}
        <View style={s.quizOptions}>
          {quizOptions.map((opt) => {
            const isCorrectOpt = opt === current.romaji;
            const isSelectedOpt = quizAnswer === opt;
            const answered = quizAnswer !== null;

            let optStyle = s.quizOptBtn;
            let textStyle = s.quizOptText;
            if (answered) {
              if (isCorrectOpt) {
                optStyle = { ...s.quizOptBtn, ...s.quizOptCorrect };
                textStyle = { ...s.quizOptText, color: "#10B981" };
              } else if (isSelectedOpt) {
                optStyle = { ...s.quizOptBtn, ...s.quizOptWrong };
                textStyle = { ...s.quizOptText, color: "#EF4444" };
              } else {
                optStyle = { ...s.quizOptBtn, opacity: 0.4 };
              }
            }

            return (
              <TouchableOpacity
                key={opt}
                style={optStyle}
                onPress={() => handleQuizAnswer(opt)}
                disabled={answered}
                activeOpacity={0.7}
              >
                {answered && isCorrectOpt && (
                  <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                )}
                {answered && isSelectedOpt && !isCorrectOpt && (
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                )}
                <Text style={textStyle}>{opt}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ═══════════════════ RENDER ═══════════════════
  return (
    <View style={[s.container, { paddingBottom: insets.bottom, paddingTop: insets.top }]}>
      {mode === "grid" && renderGrid()}
      {mode === "detail" && renderDetail()}
      {mode === "quiz" && renderQuiz()}

      {selectedKana && (
        <AddToListModal
          visible={showAddListModal}
          onClose={() => setShowAddListModal(false)}
          itemType="kana"
          itemId={selectedKana.id}
          itemTitle={selectedKana.character}
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
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  flex: { flex: 1 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: Spacing.md },
  loadingText: { color: Colors.dark.textMuted, fontSize: FontSize.sm, marginTop: Spacing.sm },

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
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
  },
  toggleActive: { backgroundColor: Colors.primary[800] + "CC", borderColor: Colors.primary[500] },
  toggleKana: { fontSize: 20, color: Colors.dark.textMuted },
  toggleKanaActive: { color: "#fff" },
  toggleLabel: { fontSize: 12, fontWeight: FontWeight.bold, color: Colors.dark.textMuted },
  toggleLabelActive: { color: "#fff" },
  hindiBtn: {
    width: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.dark.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
  },
  hindiBtnActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[500] },
  hindiBtnText: { fontSize: 18, fontWeight: FontWeight.extrabold, color: Colors.dark.textMuted },

  // ── Filter Chips ──
  chipScroll: { maxHeight: 44, marginBottom: Spacing.xs },
  chipRow: { paddingHorizontal: Spacing.lg, paddingVertical: 4, gap: 6, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    height: 32,
    backgroundColor: Colors.dark.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { color: Colors.dark.textMuted, fontSize: 12, fontWeight: FontWeight.bold },

  // ── Grid ──
  gridScroll: { paddingHorizontal: GRID_PAD, paddingBottom: 32 },
  groupSection: { marginBottom: Spacing.xl },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: 2,
  },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.dark.textSecondary,
  },
  groupLine: { flex: 1, height: 1 },
  groupCount: {
    fontSize: FontSize.xs,
    color: Colors.dark.textMuted,
    fontWeight: FontWeight.semibold,
  },
  gridRow: { flexDirection: "row", flexWrap: "wrap", gap: CARD_GAP },
  kanaCard: {
    width: CARD_SIZE,
    height: CARD_SIZE + 8,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    position: "relative",
  },
  kanaCardDakuten: { borderColor: "#F59E0B40", backgroundColor: "#F59E0B08" },
  kanaCardCombo: { borderColor: "#10B98140", backgroundColor: "#10B98108" },
  kanaStrokeCount: {
    position: "absolute",
    top: 3,
    right: 4,
    fontSize: 8,
    color: Colors.dark.textMuted,
    fontWeight: FontWeight.semibold,
  },
  kanaChar: { fontSize: 22, fontWeight: FontWeight.bold, color: Colors.dark.text },
  kanaRomaji: { fontSize: 9, color: Colors.dark.textMuted, marginTop: 2 },
  footerText: {
    textAlign: "center",
    color: Colors.dark.textMuted,
    fontSize: 12,
    marginTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },

  // ── Detail Mode ──
  detailScroll: { paddingBottom: 40 },
  detailTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  detailCounter: {
    fontSize: FontSize.sm,
    color: Colors.dark.textMuted,
    fontWeight: FontWeight.semibold,
  },
  topQuizBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },

  detailCharCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius["2xl"],
    padding: Spacing["2xl"],
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: "hidden",
  },
  detailCharGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius["2xl"],
  },
  detailGridBox: {
    backgroundColor: Colors.dark.bg + "CC",
    borderRadius: BorderRadius.xl,
    padding: 4,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    marginBottom: Spacing.xl,
  },
  detailRomaji: { fontSize: 32, fontWeight: FontWeight.extrabold, marginBottom: 2 },
  detailRomajiSub: {
    fontSize: FontSize.sm,
    color: Colors.dark.textMuted,
    marginBottom: Spacing.sm,
  },
  detailActions: {
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing["3xl"],
  },
  detailActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: Colors.primary[900] + "40",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary[700] + "50",
  },
  detailActionBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  detailActionText: { color: Colors.primary[300], fontWeight: FontWeight.bold },
  detailActionTextSecondary: { color: Colors.dark.text, fontWeight: FontWeight.bold },

  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: Spacing.xl },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: FontWeight.bold },

  // ── Cards ──
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
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
    color: Colors.dark.text,
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
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  infoLabel: { fontSize: FontSize.sm, color: Colors.dark.textMuted, fontWeight: FontWeight.medium },
  infoValue: { fontSize: FontSize.sm, color: Colors.dark.text, fontWeight: FontWeight.semibold },

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
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.dark.text },
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

  // ═══ Quiz Mode ═══
  quizContainer: { flex: 1, paddingHorizontal: Spacing.lg },
  quizHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  quizProgressWrap: { flex: 1, gap: 4 },
  quizProgressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.surface,
    overflow: "hidden",
  },
  quizProgressFill: { height: "100%", borderRadius: 3 },
  quizProgressText: {
    fontSize: 10,
    color: Colors.dark.textMuted,
    fontWeight: FontWeight.semibold,
    textAlign: "center",
  },
  quizScoreBadge: {
    backgroundColor: Colors.primary[900] + "80",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primary[700],
  },
  quizScoreText: { fontSize: 12, fontWeight: FontWeight.bold, color: Colors.primary[300] },

  quizQuestionCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius["2xl"],
    padding: Spacing["2xl"],
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: Spacing.xl,
  },
  quizPrompt: { fontSize: FontSize.sm, color: Colors.dark.textMuted, marginBottom: Spacing.xl },
  quizCharBox: {
    width: 140,
    height: 140,
    borderRadius: 24,
    backgroundColor: Colors.dark.bg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.primary[700] + "60",
    marginBottom: Spacing.md,
  },
  quizChar: { fontSize: 80, fontWeight: FontWeight.bold, color: Colors.dark.text },
  quizTapHint: { fontSize: 11, color: Colors.dark.textMuted },

  quizOptions: { gap: Spacing.md },
  quizOptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
  } as any,
  quizOptCorrect: {
    backgroundColor: "rgba(16,185,129,0.12)",
    borderColor: "#10B981",
    borderWidth: 2,
  },
  quizOptWrong: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "#EF4444",
    borderWidth: 2,
  },
  quizOptText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
  } as any,

  // ── Quiz Results ──
  quizResultCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  quizResultEmoji: { fontSize: 64, marginBottom: Spacing.md },
  quizResultTitle: {
    fontSize: FontSize["2xl"],
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  quizResultMessage: {
    fontSize: FontSize.base,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing["2xl"],
  },
  scoreRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: Colors.primary[500],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
    backgroundColor: Colors.primary[900] + "40",
  },
  scoreRingPct: { fontSize: 32, fontWeight: FontWeight.extrabold, color: Colors.primary[300] },
  scoreRingLabel: { fontSize: 11, color: Colors.dark.textMuted, fontWeight: FontWeight.semibold },
  scoreDetail: {
    flexDirection: "row",
    gap: Spacing["3xl"],
    marginBottom: Spacing["3xl"],
  },
  scoreItem: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  scoreItemText: {
    fontSize: FontSize.sm,
    color: Colors.dark.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  quizResultActions: { flexDirection: "row", gap: Spacing.md, width: "100%" },
  retryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: "#fff" },
  backGridBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  backGridBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.dark.textSecondary,
  },
});
