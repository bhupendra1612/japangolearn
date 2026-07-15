import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import { supabase } from "@/lib/supabase";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import { AddToListModal } from "@/components/AddToListModal";
import { AuthPromptModal } from "@/components/AuthPromptModal";
import StrokeWriter from "@/components/StrokeWriter";
import { useAuth } from "@/lib/auth";
import type { VocabularyWord } from "@japangolearn/database";
import { createXpAttemptKey } from "@japangolearn/content";

// ─── Types ───
type Word = VocabularyWord;

type ViewMode = "browse" | "detail" | "quiz";

// ─── Constants ───
const { width: SCREEN_W } = Dimensions.get("window");

const CATEGORY_ICONS: Record<string, string> = {
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

const CATEGORY_COLORS: Record<string, string> = {
  Verbs: "#7C3AED",
  "i-Adjectives": "#0891B2",
  "na-Adjectives": "#059669",
  Numbers: "#DC2626",
  "Food & Drink": "#D97706",
  Family: "#DB2777",
  "Daily Life": "#2563EB",
  "Animals & Birds": "#65A30D",
  "Nature & Weather": "#0D9488",
  Colors: "#9333EA",
  Time: "#F59E0B",
  "Greetings & Expressions": "#EC4899",
  "Body Parts": "#6366F1",
  "School & Study": "#14B8A6",
  Adverbs: "#F97316",
  Clothing: "#8B5CF6",
  "House & Rooms": "#78716C",
  "Question Words": "#D946EF",
  "Pronouns & People": "#0EA5E9",
  "Fruits & Vegetables": "#22C55E",
  Vehicles: "#06B6D4",
  Directions: "#0D9488",
  "Position Words": "#7C3AED",
  Counters: "#3B82F6",
  Conjunctions: "#64748B",
  Seasons: "#F43F5E",
  Months: "#6366F1",
  "Week Days": "#8B5CF6",
  "Places & Buildings": "#0891B2",
};

function getColor(topic: string): string {
  return CATEGORY_COLORS[topic] || "#6B7280";
}

function getIcon(topic: string, wordIcon: string | null): string {
  return wordIcon || CATEGORY_ICONS[topic] || "📌";
}

// ─── Main Component ───
export default function VocabularyScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>("browse");

  // Browse state
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showHindi, setShowHindi] = useState(false);
  const [speakingWordId, setSpeakingWordId] = useState<number | null>(null);

  // Detail state
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Custom List State
  const [showAddListModal, setShowAddListModal] = useState(false);
  const [showListAuthPrompt, setShowListAuthPrompt] = useState(false);
  const [showProgressAuthPrompt, setShowProgressAuthPrompt] = useState(false);

  // Quiz state
  const [quizPool, setQuizPool] = useState<Word[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [quizDone, setQuizDone] = useState(false);
  const [quizAttemptKey, setQuizAttemptKey] = useState(() => createXpAttemptKey());

  // Animations
  const cardAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadVocabulary();
  }, []);

  const loadVocabulary = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vocabulary")
      .select("id, kanji, hiragana, romaji, romaji_hindi, english, topic, jlpt_level, icon")
      .eq("jlpt_level", "N5")
      .order("topic")
      .order("hiragana");
    if (data) setWords(data);
    setLoading(false);
  };

  // ─── Derived Data ───
  const categories = useMemo(() => {
    return ["All", ...Array.from(new Set(words.map((w) => w.topic))).sort()];
  }, [words]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: words.length };
    words.forEach((w) => {
      counts[w.topic] = (counts[w.topic] || 0) + 1;
    });
    return counts;
  }, [words]);

  const filtered = useMemo(() => {
    return words.filter((w) => {
      const matchCat = selectedCategory === "All" || w.topic === selectedCategory;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (w.kanji || "").includes(q) ||
        w.hiragana.includes(q) ||
        w.english.toLowerCase().includes(q) ||
        w.romaji.toLowerCase().includes(q) ||
        (showHindi && w.romaji_hindi?.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [words, selectedCategory, search, showHindi]);

  // Group filtered words by topic for sectioned browse
  const groupedWords = useMemo(() => {
    const groups: { topic: string; data: Word[] }[] = [];
    const seen = new Set<string>();
    for (const w of filtered) {
      if (!seen.has(w.topic)) {
        seen.add(w.topic);
        groups.push({ topic: w.topic, data: filtered.filter((x) => x.topic === w.topic) });
      }
    }
    return groups;
  }, [filtered]);

  // Flat list data with section headers for FlatList
  const sectionedData = useMemo(() => {
    const items: (
      | { type: "header"; topic: string; count: number }
      | { type: "word"; word: Word; globalIndex: number }
    )[] = [];
    let globalIdx = 0;
    for (const g of groupedWords) {
      items.push({ type: "header", topic: g.topic, count: g.data.length });
      for (const w of g.data) {
        items.push({ type: "word", word: w, globalIndex: globalIdx });
        globalIdx++;
      }
    }
    return items;
  }, [groupedWords]);

  // ─── Helpers ───
  const speakWord = useCallback((word: Word) => {
    Speech.stop();
    setSpeakingWordId(word.id);
    Speech.speak(word.kanji || word.hiragana, {
      language: "ja-JP",
      pitch: 1.0,
      rate: 0.8,
      onDone: () => setSpeakingWordId(null),
      onError: () => setSpeakingWordId(null),
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
    (word: Word, idx: number) => {
      setSelectedWord(word);
      setSelectedIndex(idx);
      setMode("detail");
      cardAnim.setValue(0);
      Animated.spring(cardAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 9,
      }).start();
      speakWord(word);
    },
    [speakWord, cardAnim]
  );

  const navigateWord = useCallback(
    (direction: 1 | -1) => {
      const newIdx = selectedIndex + direction;
      if (newIdx < 0 || newIdx >= filtered.length) return;
      const word = filtered[newIdx];
      setSelectedWord(word);
      setSelectedIndex(newIdx);
      cardAnim.setValue(0);
      Animated.spring(cardAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 9,
      }).start();
      speakWord(word);
    },
    [filtered, selectedIndex, speakWord, cardAnim]
  );

  // ─── Quiz Logic ───
  const startQuiz = useCallback(() => {
    const pool = filtered.length >= 4 ? filtered : words;
    if (pool.length < 4) return;
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(15, pool.length));
    setQuizPool(shuffled);
    setQuizIndex(0);
    setQuizScore({ correct: 0, total: 0 });
    setQuizAnswer(null);
    setQuizDone(false);
    setQuizAttemptKey(createXpAttemptKey());
    setupQuizQuestion(shuffled, 0);
    setMode("quiz");
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [filtered, words, fadeAnim]);

  const setupQuizQuestion = (pool: Word[], idx: number) => {
    if (idx >= pool.length) {
      setQuizDone(true);
      return;
    }
    const target = pool[idx];
    const others = words.filter((w) => w.id !== target.id);
    const randomOthers = others.sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [...randomOthers.map((w) => w.english), target.english].sort(
      () => Math.random() - 0.5
    );
    setQuizOptions(opts);
    setQuizAnswer(null);
  };

  const handleQuizAnswer = useCallback(
    (answer: string) => {
      if (quizAnswer) return;
      setQuizAnswer(answer);
      const current = quizPool[quizIndex];
      const correct = answer === current?.english;
      setQuizScore((s) => ({
        correct: s.correct + (correct ? 1 : 0),
        total: s.total + 1,
      }));
      if (current) speakWord(current);

      setTimeout(() => {
        const next = quizIndex + 1;
        setQuizIndex(next);
        if (next >= quizPool.length) {
          const finalCorrect = quizScore.correct + (correct ? 1 : 0);
          if (session && finalCorrect > 0) {
            supabase
              .rpc("award_xp", {
                p_activity_type: "vocabulary_quiz",
                p_correct_answers: finalCorrect,
                p_total_questions: quizPool.length,
                p_attempt_key: quizAttemptKey,
              })
              .then();
          }
          setQuizDone(true);
        } else {
          setupQuizQuestion(quizPool, next);
        }
      }, 1200);
    },
    [quizAnswer, quizPool, quizIndex, quizAttemptKey, session, speakWord]
  );

  // ═══════════════════ BROWSE MODE ═══════════════════
  const renderBrowse = () => (
    <View style={s.flex}>
      {/* Hero Banner */}
      <View style={s.heroBanner}>
        <LinearGradient
          colors={[Colors.primary[700], "#1E1064"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroGradient}
        >
          <View style={s.heroLeft}>
            <Text style={s.heroKanji}>語</Text>
          </View>
          <View style={s.heroRight}>
            <Text style={s.heroTitle}>Vocabulary</Text>
            <Text style={s.heroSubtitle}>
              {words.length} N5 words · {categories.length - 1} topics
            </Text>
            <View style={s.heroActions}>
              <TouchableOpacity style={s.heroQuizBtn} onPress={startQuiz} activeOpacity={0.8}>
                <Ionicons name="help-circle" size={16} color="#fff" />
                <Text style={s.heroQuizBtnText}>Quiz Me</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Decorative */}
          <Text style={s.heroDecorative}>語彙</Text>
        </LinearGradient>
      </View>

      {/* Search + Hindi Toggle Row */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={17} color={Colors.dark.textMuted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search japanese / english / romaji..."
            placeholderTextColor={Colors.dark.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={17} color={Colors.dark.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[s.hindiToggle, showHindi && s.hindiToggleActive]}
          onPress={() => setShowHindi(!showHindi)}
          activeOpacity={0.8}
        >
          <Text style={[s.hindiToggleText, showHindi && { color: "#fff" }]}>हिं</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipRow}
        style={s.chipScroll}
        bounces={false}
      >
        {categories.map((cat) => {
          const isSelected = cat === selectedCategory;
          const c = cat === "All" ? Colors.primary[500] : getColor(cat);
          return (
            <TouchableOpacity
              key={cat}
              style={[s.chip, isSelected && { backgroundColor: c + "20", borderColor: c }]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.8}
            >
              {cat !== "All" && <Text style={s.chipIcon}>{CATEGORY_ICONS[cat] || "📌"}</Text>}
              <Text style={[s.chipLabel, isSelected && { color: c, fontWeight: "700" as const }]}>
                {cat}
              </Text>
              <View style={[s.chipCountBadge, isSelected && { backgroundColor: c + "30" }]}>
                <Text style={[s.chipCount, isSelected && { color: c }]}>
                  {categoryCounts[cat] || 0}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Result count */}
      <Text style={s.resultCount}>
        <Text style={{ color: Colors.primary[400], fontWeight: "700" as const }}>
          {filtered.length}
        </Text>{" "}
        words{selectedCategory !== "All" ? ` · ${selectedCategory}` : ""}
      </Text>

      {/* Sectioned word list */}
      {loading ? (
        <View style={s.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={s.loadingText}>Loading N5 Vocabulary...</Text>
        </View>
      ) : (
        <FlatList
          data={sectionedData}
          keyExtractor={(item, index) => {
            if (item.type === "header") return `header-${item.topic}`;
            return `word-${item.word.id}`;
          }}
          renderItem={({ item }) => {
            if (item.type === "header") {
              const color = getColor(item.topic);
              return (
                <View style={s.sectionHeader}>
                  <View style={[s.sectionDot, { backgroundColor: color }]} />
                  <Text style={s.sectionTitle}>{item.topic}</Text>
                  <Text style={s.sectionIcon}>{CATEGORY_ICONS[item.topic] || "📌"}</Text>
                  <View style={[s.sectionLine, { backgroundColor: color + "30" }]} />
                  <Text style={s.sectionCount}>{item.count}</Text>
                </View>
              );
            }
            return renderWordCard(item.word, item.globalIndex);
          }}
          contentContainerStyle={s.listContainer}
          showsVerticalScrollIndicator={false}
          initialNumToRender={25}
          maxToRenderPerBatch={20}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🔍</Text>
              <Text style={s.emptyText}>No words found</Text>
              <Text style={s.emptySubtext}>Try a different search or category</Text>
            </View>
          }
          ListFooterComponent={
            filtered.length > 0 ? (
              <Text style={s.footerText}>
                語彙は言語の基礎 — Vocabulary is the foundation of language.
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );

  // ─── Word Card ───
  const renderWordCard = (word: Word, globalIndex: number) => {
    const color = getColor(word.topic);
    const isSpeaking = speakingWordId === word.id;
    const wordIcon = getIcon(word.topic, word.icon);

    return (
      <TouchableOpacity
        style={[s.wordCard, { borderLeftColor: color, borderLeftWidth: 3 }]}
        onPress={() => openDetail(word, globalIndex)}
        activeOpacity={0.85}
      >
        {/* Background watermark icon */}
        <Text style={s.watermarkIcon} numberOfLines={1}>
          {wordIcon}
        </Text>

        <View style={s.wordRow}>
          {/* Japanese word */}
          <View style={s.wordMain}>
            <Text style={s.wordJapanese}>{word.kanji || word.hiragana}</Text>
            {word.kanji && <Text style={s.wordReading}>{word.hiragana}</Text>}
          </View>

          {/* Meanings */}
          <View style={s.meaningCol}>
            <Text style={s.wordMeaning} numberOfLines={2}>
              {word.english}
            </Text>
            {showHindi && word.romaji_hindi && (
              <Text style={s.hindiMeaning}>🇮🇳 {word.romaji_hindi}</Text>
            )}
            <Text style={s.romaji}>{word.romaji}</Text>
          </View>

          {/* Speak button */}
          <TouchableOpacity
            style={[s.speakBtn, isSpeaking && s.speakBtnActive]}
            onPress={(e) => {
              e.stopPropagation();
              speakWord(word);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isSpeaking ? "volume-high" : "volume-medium-outline"}
              size={18}
              color={isSpeaking ? "#fff" : Colors.primary[400]}
            />
          </TouchableOpacity>

          {/* Detail arrow */}
          <Ionicons name="chevron-forward" size={14} color={Colors.dark.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  // ═══════════════════ DETAIL MODE ═══════════════════
  const renderDetail = () => {
    if (!selectedWord) return null;
    const total = filtered.length;
    const canPrev = selectedIndex > 0;
    const canNext = selectedIndex < total - 1;
    const color = getColor(selectedWord.topic);
    const wordIcon = getIcon(selectedWord.topic, selectedWord.icon);
    const isSpeaking = speakingWordId === selectedWord.id;
    const displayChar = selectedWord.kanji || selectedWord.hiragana;

    return (
      <Animated.ScrollView
        style={[s.flex, { opacity: cardAnim }]}
        contentContainerStyle={s.detailScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={s.detailTopBar}>
          <TouchableOpacity onPress={() => setMode("browse")} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={s.detailCounter}>
            {selectedIndex + 1} / {total}
          </Text>
          <TouchableOpacity onPress={startQuiz} style={s.topQuizBtn} activeOpacity={0.7}>
            <Ionicons name="help-circle-outline" size={20} color={Colors.primary[400]} />
          </TouchableOpacity>
        </View>

        {/* Large Word Card */}
        <View style={s.detailCharCard}>
          <LinearGradient colors={[color + "15", "transparent"]} style={s.detailCharGlow} />

          {/* Watermark */}
          <Text style={s.detailWatermark}>{wordIcon}</Text>

          {/* Main word display (Animated first character) */}
          <View style={s.detailMainCharContainer}>
            {selectedWord.kanji ? (
              <StrokeWriter
                character={selectedWord.kanji[0]}
                size={120}
                color={color}
                outlineColor={Colors.dark.surface}
              />
            ) : (
              <StrokeWriter
                character={selectedWord.hiragana[0]}
                size={120}
                color={color}
                outlineColor={Colors.dark.surface}
              />
            )}
          </View>

          {/* Full Japanese Word Below Animation */}
          <Text style={s.detailJapaneseFull}>{displayChar}</Text>

          {/* Hiragana reading (if kanji exists) */}
          {selectedWord.kanji && <Text style={s.detailHiragana}>{selectedWord.hiragana}</Text>}

          {/* Render the full string below the first animated character if needed */}
          <Text style={[s.detailRomaji, { color, marginTop: Spacing.md }]}>
            {showHindi && selectedWord.romaji_hindi
              ? selectedWord.romaji_hindi
              : selectedWord.romaji}
          </Text>
          {showHindi && selectedWord.romaji_hindi && (
            <Text style={s.detailRomajiSub}>{selectedWord.romaji}</Text>
          )}

          {/* Divider */}
          <View style={s.detailDivider} />

          {/* English Meaning */}
          <Text style={s.detailEnglish}>{selectedWord.english}</Text>
          {showHindi && selectedWord.romaji_hindi && (
            <Text style={s.detailHindiMeaning}>🇮🇳 {selectedWord.romaji_hindi}</Text>
          )}

          {/* Action buttons */}
          <View style={s.detailActions}>
            <TouchableOpacity
              style={[s.detailActionBtn, isSpeaking && { backgroundColor: Colors.primary[600] }]}
              onPress={() => speakWord(selectedWord)}
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
              <Text style={s.badgeIcon}>{wordIcon}</Text>
              <Text style={[s.badgeText, { color }]}>{selectedWord.topic}</Text>
            </View>
            <View style={[s.badge, { backgroundColor: "#7C3AED18", borderColor: "#7C3AED40" }]}>
              <Text style={[s.badgeText, { color: "#7C3AED" }]}>JLPT N5</Text>
            </View>
          </View>
        </View>

        {/* Word Info Card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="information-circle" size={16} color={Colors.accent[400]} />
            <Text style={s.cardTitle}>Details</Text>
          </View>
          {[
            { label: "Japanese", value: displayChar },
            ...(selectedWord.kanji ? [{ label: "Kanji", value: selectedWord.kanji }] : []),
            { label: "Hiragana", value: selectedWord.hiragana },
            { label: "Romaji", value: selectedWord.romaji },
            ...(selectedWord.romaji_hindi
              ? [{ label: "Hindi", value: selectedWord.romaji_hindi }]
              : []),
            { label: "English", value: selectedWord.english },
            { label: "Topic", value: selectedWord.topic },
            { label: "JLPT Level", value: selectedWord.jlpt_level },
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

        {/* More Words in this Topic */}
        {(() => {
          const topicWords = words.filter(
            (w) => w.topic === selectedWord.topic && w.id !== selectedWord.id
          );
          if (topicWords.length === 0) return null;
          const preview = topicWords.slice(0, 5);
          return (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.badgeIcon}>{wordIcon}</Text>
                <Text style={s.cardTitle}>More in {selectedWord.topic}</Text>
                <View style={[s.relatedCountBadge, { backgroundColor: color + "20" }]}>
                  <Text style={[s.relatedCountText, { color }]}>{topicWords.length}</Text>
                </View>
              </View>
              {preview.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  style={s.relatedWordRow}
                  onPress={() => {
                    const idx = filtered.findIndex((f) => f.id === w.id);
                    openDetail(w, idx >= 0 ? idx : 0);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={s.relatedJapanese}>{w.kanji || w.hiragana}</Text>
                  <Text style={s.relatedEnglish} numberOfLines={1}>
                    {w.english}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.dark.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          );
        })()}

        {/* Navigation */}
        <View style={s.detailNav}>
          <TouchableOpacity
            style={[s.navBtn, !canPrev && s.navBtnDisabled]}
            onPress={() => navigateWord(-1)}
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
            onPress={() => navigateWord(1)}
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

            {!session && (
              <TouchableOpacity
                style={s.quizSavePrompt}
                onPress={() => setShowProgressAuthPrompt(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="lock-closed-outline" size={17} color={Colors.primary[300]} />
                <Text style={s.quizSavePromptText}>Sign in to save XP and progress</Text>
              </TouchableOpacity>
            )}

            <View style={s.quizResultActions}>
              <TouchableOpacity style={s.retryBtn} onPress={startQuiz} activeOpacity={0.7}>
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={s.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.backGridBtn}
                onPress={() => setMode("browse")}
                activeOpacity={0.7}
              >
                <Text style={s.backGridBtnText}>Back to Library</Text>
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
    const displayChar = current.kanji || current.hiragana;
    const color = getColor(current.topic);

    return (
      <View style={s.quizContainer}>
        {/* Quiz header */}
        <View style={s.quizHeader}>
          <TouchableOpacity onPress={() => setMode("browse")} activeOpacity={0.7}>
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
          <Text style={s.quizPrompt}>What does this word mean?</Text>

          <TouchableOpacity onPress={() => speakWord(current)} activeOpacity={0.8}>
            <View style={[s.quizCharBox, { borderColor: color + "60" }]}>
              <Text style={s.quizChar}>{displayChar}</Text>
            </View>
          </TouchableOpacity>

          {current.kanji && <Text style={s.quizHiragana}>{current.hiragana}</Text>}
          <Text style={s.quizRomaji}>{current.romaji}</Text>
          <Text style={s.quizTapHint}>Tap word to hear pronunciation</Text>
        </View>

        {/* Options */}
        <View style={s.quizOptions}>
          {quizOptions.map((opt) => {
            const isCorrectOpt = opt === current.english;
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
                <Text style={textStyle} numberOfLines={2}>
                  {opt}
                </Text>
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
      {mode === "browse" && renderBrowse()}
      {mode === "detail" && renderDetail()}
      {mode === "quiz" && renderQuiz()}

      {selectedWord && (
        <AddToListModal
          visible={showAddListModal}
          onClose={() => setShowAddListModal(false)}
          itemType="vocabulary"
          itemId={selectedWord.id}
          itemTitle={selectedWord.kanji || selectedWord.hiragana}
        />
      )}

      <AuthPromptModal
        visible={showListAuthPrompt}
        feature="practice lists"
        redirectTo="/(tabs)/vocabulary"
        description="Sign in to add vocabulary to custom lists and sync your practice progress."
        onClose={() => setShowListAuthPrompt(false)}
      />
      <AuthPromptModal
        visible={showProgressAuthPrompt}
        feature="saved quiz progress"
        redirectTo="/(tabs)/vocabulary"
        description="Sign in to earn XP and keep your quiz progress synced across devices."
        onClose={() => setShowProgressAuthPrompt(false)}
      />
    </View>
  );
}

// ════════════════════════ STYLES ════════════════════════
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  flex: { flex: 1 },
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: Spacing.md },
  loadingText: { color: Colors.dark.textSecondary, fontSize: FontSize.base, marginTop: Spacing.sm },

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
  heroKanji: { fontSize: 36, color: "#fff", fontWeight: FontWeight.bold },
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

  // ── Search ──
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  searchInput: { flex: 1, color: Colors.dark.text, fontSize: FontSize.sm },
  hindiToggle: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.dark.card,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    justifyContent: "center",
    alignItems: "center",
  },
  hindiToggleActive: { backgroundColor: "#7C3AED", borderColor: "#5B21B6" },
  hindiToggleText: { color: Colors.dark.textMuted, fontSize: 18, fontWeight: FontWeight.extrabold },

  // ── Chips ──
  chipScroll: { maxHeight: 46, marginBottom: 6 },
  chipRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    height: 34,
    backgroundColor: Colors.dark.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  chipIcon: { fontSize: 13, lineHeight: 18 },
  chipLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: FontWeight.semibold,
    lineHeight: 16,
  },
  chipCountBadge: {
    backgroundColor: Colors.dark.bg,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: "center",
  },
  chipCount: { color: Colors.dark.textMuted, fontSize: 10, fontWeight: FontWeight.bold },

  // ── Results ──
  resultCount: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    paddingHorizontal: Spacing.lg,
    marginBottom: 8,
  },

  // ── Section Headers ──
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
    paddingHorizontal: 2,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.dark.textSecondary,
  },
  sectionIcon: { fontSize: 14 },
  sectionLine: { flex: 1, height: 1 },
  sectionCount: {
    fontSize: FontSize.xs,
    color: Colors.dark.textMuted,
    fontWeight: FontWeight.semibold,
  },

  // ── Word Cards ──
  listContainer: { paddingHorizontal: Spacing.lg, paddingBottom: 24 },
  wordCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: "hidden",
    marginBottom: 7,
  },
  watermarkIcon: {
    position: "absolute",
    right: -4,
    top: -4,
    fontSize: 64,
    opacity: 0.08,
  },
  wordRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  wordMain: { alignItems: "center", minWidth: 64, maxWidth: 76 },
  wordJapanese: { fontSize: 22, color: Colors.dark.text, fontWeight: FontWeight.bold },
  wordReading: { fontSize: 10, color: Colors.dark.textMuted, marginTop: 1 },
  meaningCol: { flex: 1 },
  wordMeaning: { color: Colors.dark.text, fontSize: 13, lineHeight: 18 },
  hindiMeaning: { color: "#F97316", fontSize: 12, marginTop: 2, fontWeight: FontWeight.semibold },
  romaji: { color: Colors.dark.textMuted, fontSize: 11, marginTop: 2, fontStyle: "italic" },
  speakBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.primary[900] + "80",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.primary[800],
  },
  speakBtnActive: { backgroundColor: Colors.primary[600], borderColor: Colors.primary[500] },

  // ── Footer ──
  footerText: {
    textAlign: "center",
    color: Colors.dark.textMuted,
    fontSize: 12,
    marginTop: Spacing.xl,
    paddingBottom: Spacing.md,
    fontStyle: "italic",
  },

  // ── Empty ──
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: {
    color: Colors.dark.textMuted,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  emptySubtext: { color: Colors.dark.textMuted, fontSize: FontSize.sm },

  // ═══ Detail Mode ═══
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
  detailWatermark: {
    position: "absolute",
    right: 10,
    top: 10,
    fontSize: 80,
    opacity: 0.06,
  },
  detailJapanese: {
    fontSize: 72,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    marginBottom: 4,
    textAlign: "center",
  },
  detailHiragana: {
    fontSize: FontSize.xl,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
    fontWeight: FontWeight.semibold,
  },
  detailRomaji: { fontSize: 28, fontWeight: FontWeight.extrabold, marginBottom: 2 },
  detailRomajiSub: {
    fontSize: FontSize.sm,
    color: Colors.dark.textMuted,
    marginBottom: Spacing.sm,
  },
  detailDivider: {
    width: 60,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: Spacing.lg,
  },
  detailEnglish: {
    fontSize: FontSize["2xl"],
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: 4,
  },
  detailHindiMeaning: {
    fontSize: FontSize.base,
    color: "#F97316",
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  detailMainCharContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 140,
    marginTop: Spacing.lg,
  },
  detailJapaneseFull: {
    fontSize: FontSize["3xl"],
    fontWeight: "800",
    color: Colors.dark.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  detailActions: {
    flexDirection: "row",
    gap: Spacing.md,
    justifyContent: "center",
    marginTop: Spacing.xl,
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

  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeIcon: { fontSize: 13 },
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
  relatedCountBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  relatedCountText: { fontSize: 11, fontWeight: FontWeight.bold },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  infoLabel: { fontSize: FontSize.sm, color: Colors.dark.textMuted, fontWeight: FontWeight.medium },
  infoValue: {
    fontSize: FontSize.sm,
    color: Colors.dark.text,
    fontWeight: FontWeight.semibold,
    maxWidth: "60%" as any,
    textAlign: "right",
  },

  relatedWordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + "60",
  },
  relatedJapanese: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    minWidth: 60,
  },
  relatedEnglish: { flex: 1, fontSize: FontSize.sm, color: Colors.dark.textSecondary },

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
    width: 160,
    height: 120,
    borderRadius: 24,
    backgroundColor: Colors.dark.bg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    marginBottom: Spacing.md,
  },
  quizChar: { fontSize: 52, fontWeight: FontWeight.bold, color: Colors.dark.text },
  quizHiragana: {
    fontSize: FontSize.lg,
    color: Colors.primary[400],
    fontWeight: FontWeight.semibold,
    marginBottom: 2,
  },
  quizRomaji: {
    fontSize: FontSize.sm,
    color: Colors.dark.textMuted,
    fontStyle: "italic",
    marginBottom: Spacing.xs,
  },
  quizTapHint: { fontSize: 11, color: Colors.dark.textMuted },

  quizOptions: { gap: Spacing.md },
  quizOptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
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
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    textAlign: "center",
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
  quizSavePrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary[700],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary[900] + "40",
  },
  quizSavePromptText: {
    color: Colors.primary[200],
    fontSize: FontSize.sm,
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
