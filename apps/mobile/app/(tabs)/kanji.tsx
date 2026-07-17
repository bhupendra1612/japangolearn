import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import { supabase } from "@/lib/supabase";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import StrokeWriter from "@/components/StrokeWriter";
import type { Kanji as KanjiRow } from "@japangolearn/database";

// ─── Types ─────────────────────────────────────────────
type KunReading = { reading: string; romaji: string; hindi: string };
type OnReading = { reading: string; romaji: string; hindi: string };
type VocabItem = {
  word: string;
  hiragana: string;
  romaji: string;
  hindi_pronunciation: string;
  hindi: string;
  english: string;
};
type Example = {
  jp: string;
  hiragana: string;
  romaji: string;
  hindi_pronunciation: string;
  hindi: string;
  english: string;
};

type Kanji = KanjiRow;

function jsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

const TAG_COLORS: Record<string, string> = {
  nature: "#10B981",
  basic: "#7C3AED",
  time: "#F59E0B",
  people: "#EC4899",
  element: "#3B82F6",
  calendar: "#6366F1",
  geography: "#14B8A6",
  water: "#0EA5E9",
  plant: "#22C55E",
  energy: "#F97316",
  money: "#EAB308",
};

// ─── Kanji Detail Modal ──────────────────────────────────
function KanjiDetailModal({
  kanji,
  onClose,
  showHindi,
  onSelectRelated,
}: {
  kanji: Kanji;
  onClose: () => void;
  showHindi: boolean;
  onSelectRelated?: (k: string) => void;
}) {
  const [tab, setTab] = useState<"info" | "vocab" | "examples">("info");
  const [speakingText, setSpeakingText] = useState<string | null>(null);

  const safeSpeak = useCallback(
    (text: string) => {
      if (speakingText) Speech.stop();
      setSpeakingText(text);
      try {
        Speech.speak(text, {
          language: "ja-JP",
          rate: 0.8,
          onDone: () => setSpeakingText(null),
          onError: (err) => {
            console.warn("Speech error:", err);
            setSpeakingText(null);
          },
          onStopped: () => setSpeakingText(null),
        });
      } catch (err) {
        console.warn("Speech catch error:", err);
        setSpeakingText(null);
      }
    },
    [speakingText]
  );

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={modal.container}>
        {/* Header */}
        <LinearGradient colors={["#1A1035", "#0F0B1E"]} style={modal.header}>
          <View style={modal.headerTop}>
            <TouchableOpacity onPress={onClose} style={modal.closeBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-down" size={24} color={Colors.dark.text} />
            </TouchableOpacity>

            {/* Audio Play Button */}
            <TouchableOpacity
              style={[
                modal.headerPlayBtn,
                speakingText === kanji.character && { backgroundColor: Colors.primary[500] },
              ]}
              onPress={() => safeSpeak(kanji.character)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={speakingText === kanji.character ? "volume-high" : "volume-medium-outline"}
                size={20}
                color={speakingText === kanji.character ? "#fff" : Colors.primary[300]}
              />
              <Text
                style={[
                  modal.headerPlayText,
                  speakingText === kanji.character && { color: "#fff" },
                ]}
              >
                Play
              </Text>
            </TouchableOpacity>

            <Text style={modal.jlptBadge}>{kanji.jlpt_level}</Text>
          </View>

          {/* Big kanji character */}
          <View style={modal.charWrap}>
            <View style={modal.charBox}>
              <StrokeWriter
                character={kanji.character}
                size={100}
                color={Colors.primary[500]}
                outlineColor={Colors.dark.border}
              />
            </View>
            <View style={modal.charMeta}>
              <Text style={modal.charIcon}>{kanji.icon}</Text>
              <Text style={modal.charMeaning}>{kanji.meaning_en.join(" / ")}</Text>
              {showHindi && <Text style={modal.charMeaningHi}>{kanji.meaning_hi.join(" / ")}</Text>}
              <View style={modal.metaRow}>
                <View style={modal.metaPill}>
                  <Ionicons name="brush-outline" size={11} color={Colors.dark.textMuted} />
                  <Text style={modal.metaPillText}>{kanji.stroke_count} strokes</Text>
                </View>
                <View style={modal.metaPill}>
                  <Text style={modal.metaPillText}>Radical: {kanji.radical}</Text>
                </View>
                {kanji.frequency_rank && (
                  <View
                    style={[
                      modal.metaPill,
                      { backgroundColor: "#F59E0B18", borderColor: "#F59E0B40" },
                    ]}
                  >
                    <Ionicons name="flame-outline" size={11} color="#F59E0B" />
                    <Text style={[modal.metaPillText, { color: "#F59E0B" }]}>
                      {kanji.frequency_rank}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={modal.tabs}>
            {(["info", "vocab", "examples"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[modal.tab, tab === t && modal.tabActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[modal.tabText, tab === t && modal.tabTextActive]}>
                  {t === "info" ? "Readings" : t === "vocab" ? "Vocabulary" : "Examples"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        <ScrollView style={modal.body} showsVerticalScrollIndicator={false}>
          {/* ── INFO TAB ── */}
          {tab === "info" && (
            <View style={modal.section}>
              {/* Kun readings */}
              <Text style={modal.sectionLabel}>KUN READING (訓読み)</Text>
              {kanji.kunyomi.map((k, i) => (
                <View key={i} style={modal.readingRow}>
                  <View style={[modal.readingDot, { backgroundColor: "#10B981" }]} />
                  <View>
                    <Text style={modal.readingKana}>{k.reading}</Text>
                    <Text style={modal.readingRomaji}>
                      {k.romaji}
                      {showHindi ? ` · ${k.hindi}` : ""}
                    </Text>
                  </View>
                </View>
              ))}

              {/* On readings */}
              <Text style={[modal.sectionLabel, { marginTop: Spacing.lg }]}>
                ON READING (音読み)
              </Text>
              {kanji.onyomi.map((o, i) => (
                <View key={i} style={modal.readingRow}>
                  <View style={[modal.readingDot, { backgroundColor: Colors.primary[400] }]} />
                  <View>
                    <Text style={modal.readingKana}>{o.reading}</Text>
                    <Text style={modal.readingRomaji}>
                      {o.romaji}
                      {showHindi ? ` · ${o.hindi}` : ""}
                    </Text>
                  </View>
                </View>
              ))}

              {/* Mnemonic */}
              {kanji.mnemonic && (
                <View style={modal.tipBox}>
                  <Text style={modal.tipTitle}>💡 Mnemonic</Text>
                  <Text style={modal.tipText}>{kanji.mnemonic}</Text>
                </View>
              )}

              {/* Writing tip */}
              {kanji.writing_tip && (
                <View
                  style={[modal.tipBox, { backgroundColor: "#3B82F618", borderColor: "#3B82F640" }]}
                >
                  <Text style={[modal.tipTitle, { color: "#3B82F6" }]}>✍️ Writing Order</Text>
                  <Text style={modal.tipText}>{kanji.writing_tip}</Text>
                </View>
              )}

              {/* Related & Confusable */}
              {kanji.related_kanji.length > 0 && (
                <View style={modal.relatedBox}>
                  <Text style={modal.sectionLabel}>🔁 RELATED KANJI</Text>
                  <View style={modal.chipRow}>
                    {kanji.related_kanji.map((k) => (
                      <TouchableOpacity
                        key={k}
                        style={modal.chip}
                        onPress={() => onSelectRelated?.(k)}
                        activeOpacity={0.7}
                      >
                        <Text style={modal.chipText}>{k}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              {kanji.confusable_kanji.length > 0 && (
                <View style={modal.relatedBox}>
                  <Text style={modal.sectionLabel}>⚠️ CONFUSABLE WITH</Text>
                  <View style={modal.chipRow}>
                    {kanji.confusable_kanji.map((k) => (
                      <TouchableOpacity
                        key={k}
                        style={[
                          modal.chip,
                          { backgroundColor: "#EF444418", borderColor: "#EF444440" },
                        ]}
                        onPress={() => onSelectRelated?.(k)}
                        activeOpacity={0.7}
                      >
                        <Text style={[modal.chipText, { color: "#EF4444" }]}>{k}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── VOCAB TAB ── */}
          {tab === "vocab" && (
            <View style={modal.section}>
              {kanji.vocabulary.map((v, i) => (
                <View key={i} style={modal.vocabCard}>
                  <View style={modal.vocabTop}>
                    <Text style={modal.vocabWord}>{v.word}</Text>
                    <Text style={modal.vocabHiragana}>{v.hiragana}</Text>
                    <TouchableOpacity
                      style={modal.vocabAudioBtn}
                      onPress={() => safeSpeak(v.word || v.hiragana)}
                      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                      <Ionicons
                        name={
                          speakingText === (v.word || v.hiragana)
                            ? "volume-high"
                            : "volume-medium-outline"
                        }
                        size={18}
                        color={
                          speakingText === (v.word || v.hiragana)
                            ? Colors.primary[300]
                            : Colors.primary[500]
                        }
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={modal.vocabRomaji}>
                    {v.romaji}
                    {showHindi ? ` • ${v.hindi_pronunciation}` : ""}
                  </Text>
                  <View style={modal.vocabMeanings}>
                    <Text style={modal.vocabEn}>{v.english}</Text>
                    {showHindi && <Text style={modal.vocabHi}>{v.hindi}</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── EXAMPLES TAB ── */}
          {tab === "examples" && (
            <View style={modal.section}>
              {kanji.example_sentences.map((e, i) => (
                <View key={i} style={modal.exampleCard}>
                  <View style={modal.exampleHeaderRow}>
                    <Text style={modal.exampleJp}>{e.jp}</Text>
                    <TouchableOpacity
                      style={modal.exampleAudioBtn}
                      onPress={() => safeSpeak(e.jp)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={speakingText === e.jp ? "volume-high" : "volume-medium-outline"}
                        size={18}
                        color={speakingText === e.jp ? Colors.primary[300] : Colors.primary[500]}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={modal.exampleHiragana}>{e.hiragana}</Text>
                  <Text style={modal.exampleRomaji}>{e.romaji}</Text>
                  {showHindi && <Text style={modal.exampleHindiPron}>{e.hindi_pronunciation}</Text>}
                  <View style={modal.exampleMeanings}>
                    <Text style={modal.exampleEn}>{e.english}</Text>
                    {showHindi && <Text style={modal.exampleHi}>{e.hindi}</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Kanji Card ─────────────────────────────────────────
function KanjiCard({
  item,
  onPress,
  showHindi,
}: {
  item: Kanji;
  onPress: () => void;
  showHindi: boolean;
}) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = useCallback(
    (e: any) => {
      e.stopPropagation(); // Prevent modal opening
      Speech.stop();
      setIsSpeaking(true);
      try {
        Speech.speak(item.character, {
          language: "ja-JP",
          rate: 0.8,
          onDone: () => setIsSpeaking(false),
          onError: (err) => {
            console.warn("Speech error on card:", err);
            setIsSpeaking(false);
          },
          onStopped: () => setIsSpeaking(false),
        });
      } catch (err) {
        console.warn("Catch speech error:", err);
        setIsSpeaking(false);
      }
    },
    [item.character]
  );

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Left: Big character */}
      <View style={styles.charColumn}>
        <LinearGradient
          colors={["rgba(124,58,237,0.25)", "rgba(124,58,237,0.08)"]}
          style={styles.charBg}
        >
          <Text style={styles.charText}>{item.character}</Text>
        </LinearGradient>
        <Text style={styles.charOrder}>#{item.order_index}</Text>
      </View>

      {/* Right: Info */}
      <View style={styles.info}>
        <View style={styles.infoTop}>
          <View>
            <Text style={styles.reading}>
              {item.hiragana} · {item.romaji}
            </Text>
            <Text style={styles.meaning}>{item.meaning_en.join(", ")}</Text>
            {showHindi && <Text style={styles.meaningHi}>{item.meaning_hi.join(", ")}</Text>}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TouchableOpacity
              style={[styles.playBtn, isSpeaking && styles.playBtnActive]}
              onPress={handleSpeak}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons
                name={isSpeaking ? "volume-high" : "volume-medium-outline"}
                size={16}
                color={isSpeaking ? "#fff" : Colors.primary[400]}
              />
            </TouchableOpacity>
            <Text style={styles.icon}>{item.icon}</Text>
          </View>
        </View>
        <View style={styles.tagsRow}>
          {item.frequency_rank && (
            <View style={[styles.tag, { backgroundColor: "#F59E0B18", borderColor: "#F59E0B40" }]}>
              <Text style={[styles.tagText, { color: "#F59E0B" }]}>🔥 {item.frequency_rank}</Text>
            </View>
          )}
          {item.tags.slice(0, 2).map((t) => (
            <View
              key={t}
              style={[
                styles.tag,
                {
                  backgroundColor: (TAG_COLORS[t] || "#7C3AED") + "18",
                  borderColor: (TAG_COLORS[t] || "#7C3AED") + "40",
                },
              ]}
            >
              <Text style={[styles.tagText, { color: TAG_COLORS[t] || Colors.primary[400] }]}>
                {t}
              </Text>
            </View>
          ))}
          <View style={styles.tag}>
            <Text style={styles.tagText}>✏️ {item.stroke_count}st</Text>
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={Colors.dark.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────
export default function KanjiScreen() {
  const insets = useSafeAreaInsets();
  const [kanji, setKanji] = useState<Kanji[]>([]);
  const [filtered, setFiltered] = useState<Kanji[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selected, setSelected] = useState<Kanji | null>(null);
  const [showHindi, setShowHindi] = useState(true);

  useEffect(() => {
    fetchKanji();
  }, []);

  const fetchKanji = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("kanji").select("*").order("order_index");
    if (!error && data) {
      const normalized: Kanji[] = data.map((row) => ({
        ...row,
        kunyomi: jsonArray<KunReading>(row.kunyomi),
        onyomi: jsonArray<OnReading>(row.onyomi),
        vocabulary: jsonArray<VocabItem>(row.vocabulary),
        example_sentences: jsonArray<Example>(row.example_sentences),
      }));
      setKanji(normalized);
      setFiltered(normalized);
    }
    setLoading(false);
  };

  // Collect all unique tags
  const allTags = Array.from(new Set(kanji.flatMap((k) => k.tags))).sort();

  const applyFilters = useCallback(
    (q: string, tag: string | null) => {
      let list = kanji;
      if (tag) list = list.filter((k) => k.tags.includes(tag));
      if (q.trim()) {
        const lq = q.toLowerCase();
        list = list.filter(
          (k) =>
            k.character.includes(q) ||
            k.meaning_en.some((m) => m.toLowerCase().includes(lq)) ||
            k.meaning_hi.some((m) => m.includes(q)) ||
            k.romaji.toLowerCase().includes(lq) ||
            k.hiragana.includes(q)
        );
      }
      setFiltered(list);
    },
    [kanji]
  );

  const onSearch = (q: string) => {
    setSearch(q);
    applyFilters(q, activeTag);
  };

  const onTag = (tag: string) => {
    const next = activeTag === tag ? null : tag;
    setActiveTag(next);
    applyFilters(search, next);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <LinearGradient colors={["#1A1035", "#0F0B1E"]} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>漢字 Kanji</Text>
            <Text style={styles.headerSub}>JLPT N5 · {kanji.length} characters</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.hindiToggle, showHindi && styles.hindiToggleActive]}
              onPress={() => setShowHindi(!showHindi)}
              activeOpacity={0.75}
            >
              <Text style={styles.hindiToggleFlag}>🇮🇳</Text>
              <Text style={[styles.hindiToggleText, showHindi && styles.hindiToggleTextActive]}>
                हिंदी
              </Text>
            </TouchableOpacity>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>N5</Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={17} color={Colors.dark.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search kanji, meaning, romaji..."
            placeholderTextColor={Colors.dark.textMuted}
            value={search}
            onChangeText={onSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => onSearch("")}>
              <Ionicons name="close-circle" size={17} color={Colors.dark.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tag filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagScroll}
          contentContainerStyle={styles.tagScrollContent}
        >
          {allTags.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.tagFilter, activeTag === tag && styles.tagFilterActive]}
              onPress={() => onTag(tag)}
            >
              <Text style={[styles.tagFilterText, activeTag === tag && styles.tagFilterTextActive]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary[400]} />
          <Text style={styles.loadingText}>Loading kanji...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No kanji found</Text>
          <Text style={styles.emptySub}>Try a different search or filter</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <KanjiCard item={item} onPress={() => setSelected(item)} showHindi={showHindi} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text style={styles.countLabel}>{filtered.length} kanji</Text>}
        />
      )}

      {/* ── Detail Modal ── */}
      {selected && (
        <KanjiDetailModal
          kanji={selected}
          onClose={() => setSelected(null)}
          showHindi={showHindi}
          onSelectRelated={(char) => {
            const found = kanji.find((k) => k.character === char);
            if (found) {
              setSelected(found);
            } else {
              alert(`Kanji ${char} is not in the current N5 list yet.`);
            }
          }}
        />
      )}
    </View>
  );
}

// ════════════════════════ STYLES ════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
    paddingTop: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize["2xl"],
    fontWeight: FontWeight.extrabold,
    color: Colors.dark.text,
  },
  headerSub: { fontSize: FontSize.sm, color: Colors.dark.textMuted, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  hindiToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  hindiToggleActive: {
    backgroundColor: "rgba(255,153,51,0.15)",
    borderColor: "rgba(255,153,51,0.5)",
  },
  hindiToggleFlag: { fontSize: 14 },
  hindiToggleText: { fontSize: 12, fontWeight: FontWeight.bold, color: Colors.dark.textMuted },
  hindiToggleTextActive: { color: "#FF9933" },
  headerBadge: {
    backgroundColor: "#10B98118",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#10B98140",
  },
  headerBadgeText: { color: "#10B981", fontWeight: FontWeight.extrabold, fontSize: FontSize.sm },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: Spacing.md,
  },
  searchInput: { flex: 1, color: Colors.dark.text, fontSize: FontSize.sm },
  tagScroll: { marginBottom: 0 },
  tagScrollContent: { gap: 8, paddingRight: Spacing.lg },
  tagFilter: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
  },
  tagFilterActive: {
    borderColor: Colors.primary[400],
    backgroundColor: Colors.primary[700] + "30",
  },
  tagFilterText: {
    fontSize: FontSize.xs,
    color: Colors.dark.textMuted,
    fontWeight: FontWeight.semibold,
  },
  tagFilterTextActive: { color: Colors.primary[300] },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { color: Colors.dark.textMuted, fontSize: FontSize.sm },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: Colors.dark.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  emptySub: { color: Colors.dark.textMuted, fontSize: FontSize.sm },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: 30 },
  countLabel: {
    fontSize: FontSize.xs,
    color: Colors.dark.textMuted,
    marginBottom: Spacing.md,
    fontWeight: FontWeight.semibold,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  charColumn: { alignItems: "center", gap: 4 },
  charBg: {
    width: 58,
    height: 58,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  charText: { fontSize: 36, fontWeight: FontWeight.bold, color: Colors.dark.text },
  charOrder: { fontSize: 10, color: Colors.dark.textMuted, fontWeight: FontWeight.semibold },
  info: { flex: 1 },
  infoTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  reading: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary[400] },
  meaning: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.dark.text },
  meaningHi: { fontSize: FontSize.xs, color: Colors.dark.textMuted, marginTop: 1 },
  icon: { fontSize: 22 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tagText: { fontSize: 10, color: Colors.dark.textMuted, fontWeight: FontWeight.semibold },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(124,58,237,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  playBtnActive: {
    backgroundColor: Colors.primary[500],
  },
});

const modal = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: { paddingBottom: 0 },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  jlptBadge: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extrabold,
    color: "#10B981",
    backgroundColor: "#10B98118",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#10B98140",
  },
  charWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  charBox: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: "rgba(124,58,237,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(124,58,237,0.4)",
  },
  charText: { fontSize: 64, fontWeight: FontWeight.bold, color: Colors.dark.text },
  charMeta: { flex: 1 },
  charIcon: { fontSize: 28, marginBottom: 4 },
  charMeaning: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.dark.text },
  charMeaningHi: { fontSize: FontSize.sm, color: Colors.dark.textMuted, marginBottom: Spacing.sm },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  metaPillText: { fontSize: 10, color: Colors.dark.textMuted, fontWeight: FontWeight.semibold },
  tabs: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    marginTop: Spacing.sm,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary[400] },
  tabText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.dark.textMuted },
  tabTextActive: { color: Colors.primary[400] },
  body: { flex: 1 },
  section: { padding: Spacing.lg },
  sectionLabel: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.2,
    color: Colors.dark.textMuted,
    marginBottom: Spacing.sm,
  },
  readingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + "50",
  },
  readingDot: { width: 10, height: 10, borderRadius: 5 },
  readingKana: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.dark.text },
  readingRomaji: { fontSize: FontSize.sm, color: Colors.dark.textMuted },
  tipBox: {
    backgroundColor: "#F59E0B18",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: "#F59E0B40",
  },
  tipTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: "#F59E0B",
    marginBottom: 4,
  },
  tipText: { fontSize: FontSize.sm, color: Colors.dark.textSecondary },
  relatedBox: { marginTop: Spacing.lg },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(124,58,237,0.15)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.4)",
  },
  chipText: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.primary[300] },
  vocabCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  vocabTop: { flexDirection: "row", alignItems: "baseline", gap: Spacing.sm, marginBottom: 2 },
  vocabWord: { fontSize: FontSize["2xl"], fontWeight: FontWeight.bold, color: Colors.dark.text },
  vocabHiragana: {
    fontSize: FontSize.sm,
    color: Colors.primary[400],
    fontWeight: FontWeight.semibold,
  },
  vocabRomaji: { fontSize: FontSize.xs, color: Colors.dark.textMuted, marginBottom: 6 },
  vocabMeanings: { flexDirection: "row", gap: Spacing.md },
  vocabEn: {
    fontSize: FontSize.sm,
    color: Colors.dark.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  vocabHi: { fontSize: FontSize.sm, color: Colors.dark.textMuted },
  exampleCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary[500],
  },
  exampleJp: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  exampleHiragana: { fontSize: FontSize.sm, color: Colors.primary[400], marginBottom: 2 },
  exampleRomaji: { fontSize: FontSize.sm, color: Colors.dark.textSecondary, marginBottom: 2 },
  exampleHindiPron: { fontSize: FontSize.sm, color: Colors.dark.textMuted, marginBottom: 8 },
  exampleMeanings: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border + "60",
  },
  exampleEn: {
    fontSize: FontSize.sm,
    color: Colors.dark.textSecondary,
    fontStyle: "italic",
    flex: 1,
  },
  exampleHi: { fontSize: FontSize.sm, color: Colors.dark.textMuted, textAlign: "right", flex: 1 },
  headerPlayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(124,58,237,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.3)",
  },
  headerPlayText: {
    color: Colors.primary[300],
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
  vocabAudioBtn: { marginLeft: "auto" },
  exampleHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  exampleAudioBtn: { padding: 4 },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(124,58,237,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  playBtnActive: {
    backgroundColor: Colors.primary[500],
  },
});
