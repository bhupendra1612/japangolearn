import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import type { PracticeItemType, PracticeList } from "@japangolearn/database";
import { loadPracticeStudyItems } from "@/lib/practice-content";
import { removePracticeListItemWithQueue } from "@/lib/offline-queue";
import { readCache, updateCache, writeCache } from "@/lib/offline-cache";
import { loadListeningPracticeItems, removeListeningPracticeItem } from "@/lib/listening-practice";
import type { PracticeStudyItem } from "@japangolearn/core";

type ListItem = {
  id: string; // The practice_list_items id
  item_type: PracticeItemType;
  item_id: number;
  mastery_score: number;
  last_reviewed: string | null;
  // Detail data joined from other tables, so a whole list can be revised
  // without opening each item.
  primary: string; // the Japanese: kanji, kana character, or grammar pattern
  reading?: string; // hiragana reading, only when it differs from `primary`
  romaji?: string;
  romajiHindi?: string; // Hindi transliteration of the reading, if any
  english?: string; // meaning
  meaningHindi?: string; // short Hindi meaning, if any
  speakText?: string; // what the audio button pronounces (a reading, not kanji)
  kanaType?: "hiragana" | "katakana";
  questionId?: string;
};

const ITEM_TYPE_EMOJI: Record<PracticeItemType, string> = {
  vocabulary: "📖",
  kana: "あ",
  kanji: "漢",
  grammar: "文",
  listening: "🎧",
};

const DETAIL_ROUTES: Record<Exclude<PracticeItemType, "listening">, string> = {
  vocabulary: "/(tabs)/vocabulary",
  kana: "/(tabs)/writing",
  kanji: "/(tabs)/kanji",
  grammar: "/(tabs)/grammar",
};

export default function PracticeListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [list, setList] = useState<PracticeList | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  // The row whose audio is currently playing, so its button can show a
  // playing state. Only one plays at a time.
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const standardItemCount = items.filter((item) => item.item_type !== "listening").length;
  const listeningQuestionIds = items.flatMap((item) =>
    item.item_type === "listening" && item.questionId ? [item.questionId] : []
  );

  const speakItem = useCallback((item: ListItem) => {
    if (!item.speakText) return;
    Speech.stop();
    setSpeakingId(item.id);
    Speech.speak(item.speakText, {
      language: "ja-JP",
      pitch: 1.0,
      rate: 0.8,
      onDone: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setList(null);
    setItems([]);

    const isStillCurrentUser = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      return currentSession?.user.id === userId;
    };

    // 1. Load list details
    const listCacheKey = `practice-list:${userId}:${id}`;
    const { data: listData } = await supabase
      .from("practice_lists")
      .select("*")
      .eq("id", id)
      .single();

    if (listData && (await isStillCurrentUser())) {
      setList(listData);
      void writeCache(listCacheKey, listData);
    } else {
      const cached = await readCache<PracticeList>(listCacheKey);
      if (cached && (await isStillCurrentUser())) setList(cached.data);
    }

    // 2. Hydrate standard learning content and locally-authored listening questions.
    const [studyItems, listeningItems] = await Promise.all([
      loadPracticeStudyItems(supabase, id),
      loadListeningPracticeItems(supabase, id),
    ]);
    if (!(await isStillCurrentUser())) return;
    setItems(
      studyItems
        .map<ListItem>((item) => ({
          id: item.listItemId,
          item_type: item.itemType,
          item_id: Number(item.itemId),
          mastery_score: item.masteryScore,
          last_reviewed: item.lastReviewed,
          primary: item.front,
          reading: item.reading,
          romaji: item.romaji,
          romajiHindi: item.romajiHindi,
          english: item.english,
          meaningHindi: item.meaningHindi,
          speakText: item.audioText,
          kanaType: item.kanaType,
        }))
        .concat(
          listeningItems.map((item) => ({
            id: item.listItemId,
            item_type: "listening" as const,
            item_id: item.itemId,
            mastery_score: 0,
            last_reviewed: null,
            primary: item.prompt,
            english: `${item.skill} · Tap to practise this listening question`,
            questionId: item.questionId,
          }))
        )
    );

    setLoading(false);
  }, [id, userId]);

  useFocusEffect(
    useCallback(() => {
      if (session?.user && id) {
        void loadData();
      }
      // Stop any playing pronunciation when the screen loses focus, so audio
      // does not carry on after the user has left the list.
      return () => {
        Speech.stop();
        setSpeakingId(null);
      };
    }, [session?.user, id, loadData])
  );

  const handleRemoveItem = (item: ListItem) => {
    Alert.alert("Remove Item", "Remove this item from the list?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          if (!userId) return;
          const failed =
            item.item_type === "listening"
              ? !(await removeListeningPracticeItem(supabase, item.id)).ok
              : (
                  await removePracticeListItemWithQueue(supabase, {
                    listId: id,
                    listItemId: item.id,
                    itemType: item.item_type,
                    itemId: item.item_id,
                    expectedUserId: userId,
                  })
                ).status === "failed";
          if (failed) {
            Alert.alert("Could not remove item", "Please try again when you are connected.");
            return;
          }
          setItems((previous) => previous.filter((previousItem) => previousItem.id !== item.id));
          const cacheKey = `practice-study:${userId}:${id}`;
          void updateCache<PracticeStudyItem[]>(cacheKey, (current) => {
            if (!current) return undefined;
            return current.filter((cachedItem) => cachedItem.listItemId !== item.id);
          });
          void updateCache<PracticeList[]>(`practice-lists:${userId}`, (current) => {
            if (!current) return undefined;
            return current.map((cachedList) =>
              cachedList.id === id
                ? { ...cachedList, item_count: Math.max(0, (cachedList.item_count ?? 1) - 1) }
                : cachedList
            );
          });
          void updateCache<PracticeList>(`practice-list:${userId}:${id}`, (current) => {
            if (!current) return undefined;
            return { ...current, item_count: Math.max(0, (current.item_count ?? 1) - 1) };
          });
        },
      },
    ]);
  };

  const startFlashcards = () => {
    if (standardItemCount === 0) return;
    router.push({
      pathname: "/study/flashcards",
      params: { listId: id },
    });
  };

  const startQuiz = () => {
    if (standardItemCount === 0) return;
    router.push({
      pathname: "/study/quiz",
      params: { listId: id },
    });
  };

  const startListeningPractice = () => {
    if (listeningQuestionIds.length === 0) return;
    router.push(`/exam/run?mode=review&questionIds=${listeningQuestionIds.join(",")}` as never);
  };

  /*
   * Each content tab shows its own detail view from local state rather than a
   * route, so there is no /vocabulary/:id to link to. Handing the tab a
   * focusItemId is what lets a list row open the same full detail a learner
   * gets by tapping the word in its own tab.
   */
  const openItemDetail = useCallback(
    (item: ListItem) => {
      if (item.item_type === "listening") {
        if (item.questionId)
          router.push(`/exam/run?mode=review&questionIds=${item.questionId}` as never);
        return;
      }
      router.push({
        pathname: DETAIL_ROUTES[item.item_type] as never,
        params: {
          focusItemId: String(item.item_id),
          // Tabs stay mounted, so pushing the same word twice would hand the
          // target identical params and its effect would never re-run — the
          // second tap would do nothing. This makes every tap distinct.
          focusNonce: String(Date.now()),
          // The id of this list, so the detail's back button can return straight
          // here. Content tabs live in a different navigator, so router.back()
          // from one is not reliable — the target navigates back by this id.
          fromListId: String(id),
          ...(item.kanaType ? { focusKanaType: item.kanaType } : {}),
        },
      });
    },
    [id, router]
  );

  const getMasteryColor = (score: number) => {
    if (score >= 80) return Colors.primary[400];
    if (score >= 40) return Colors.accent[400];
    return Colors.dark.textMuted;
  };

  const renderHeader = () => (
    <View style={s.header}>
      <LinearGradient
        colors={[Colors.primary[800], "#1E0A4E"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.headerGradient, { paddingTop: insets.top + Spacing.sm }]}
      >
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={s.headerTitleRow}>
          <Text style={[s.headerTitle, list?.is_smart_list && s.smartTitle]} numberOfLines={1}>
            {list?.title || "Loading..."}
          </Text>
          {list?.is_smart_list && (
            <View style={s.smartBadge}>
              <Ionicons name="flame" size={14} color="#EF4444" />
              <Text style={s.smartBadgeText}>Smart List</Text>
            </View>
          )}
        </View>
        <Text style={s.headerSubtitle}>{items.length} items</Text>

        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.studyBtn, standardItemCount === 0 && { opacity: 0.5 }]}
            onPress={startFlashcards}
            disabled={standardItemCount === 0}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Study with flashcards"
            accessibilityState={{ disabled: standardItemCount === 0 }}
          >
            <LinearGradient
              colors={[Colors.primary[500], Colors.primary[600]]}
              style={s.studyBtnGradient}
            >
              <Ionicons name="albums-outline" size={20} color="#fff" />
              <Text style={s.studyBtnText}>Flashcards</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.studyBtn, standardItemCount === 0 && { opacity: 0.5 }]}
            onPress={startQuiz}
            disabled={standardItemCount === 0}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Start quiz"
            accessibilityState={{ disabled: standardItemCount === 0 }}
          >
            <LinearGradient
              colors={[Colors.accent[500], Colors.accent[600]]}
              style={s.studyBtnGradient}
            >
              <Ionicons name="help-circle-outline" size={20} color="#fff" />
              <Text style={s.studyBtnText}>Quiz</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        {listeningQuestionIds.length > 0 ? (
          <TouchableOpacity
            style={s.listeningBtn}
            onPress={startListeningPractice}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Practise ${listeningQuestionIds.length} saved listening mistakes`}
          >
            <View style={s.listeningIcon}>
              <Ionicons name="headset" size={20} color={Colors.sakura[300]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.listeningTitle}>Listening mistake practice</Text>
              <Text style={s.listeningMeta}>{listeningQuestionIds.length} saved questions</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={Colors.sakura[300]} />
          </TouchableOpacity>
        ) : null}
      </LinearGradient>
    </View>
  );

  return (
    <View style={s.container}>
      {renderHeader()}

      <View style={[s.content, { paddingBottom: insets.bottom }]}>
        {loading ? (
          <View style={s.centerBox}>
            <ActivityIndicator size="large" color={Colors.primary[400]} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.itemCard}
                onPress={() => openItemDetail(item)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${item.primary}${item.english ? `, ${item.english}` : ""}. Open details`}
              >
                <View style={s.itemTypeBox}>
                  <Text style={s.itemTypeEmoji}>{ITEM_TYPE_EMOJI[item.item_type]}</Text>
                </View>

                <View style={s.itemInfo}>
                  <View style={s.itemPrimaryRow}>
                    <Text style={s.itemPrimary}>{item.primary}</Text>
                    {item.reading ? <Text style={s.itemReading}>{item.reading}</Text> : null}
                  </View>

                  {item.romaji ? (
                    <Text style={s.itemRomaji} numberOfLines={1}>
                      {item.romaji}
                      {item.romajiHindi ? `  ·  ${item.romajiHindi}` : ""}
                    </Text>
                  ) : null}

                  {item.english ? (
                    <Text style={s.itemEnglish} numberOfLines={2}>
                      {item.english}
                    </Text>
                  ) : null}

                  {item.meaningHindi ? (
                    <Text style={s.itemHindi} numberOfLines={1}>
                      🇮🇳 {item.meaningHindi}
                    </Text>
                  ) : null}

                  {/* Mastery bar */}
                  {item.item_type !== "listening" ? (
                    <View style={s.masteryRow}>
                      <View style={s.masteryTrack}>
                        <View
                          style={[
                            s.masteryFill,
                            {
                              width: `${Math.max(5, item.mastery_score)}%`,
                              backgroundColor: getMasteryColor(item.mastery_score),
                            },
                          ]}
                        />
                      </View>
                      <Text style={s.masteryText}>{Math.round(item.mastery_score)}%</Text>
                    </View>
                  ) : null}
                </View>

                {/* Audio */}
                {item.speakText ? (
                  <TouchableOpacity
                    style={[s.audioBtn, speakingId === item.id && s.audioBtnActive]}
                    onPress={() => speakItem(item)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Play pronunciation of ${item.reading || item.primary}`}
                  >
                    <Ionicons
                      name={speakingId === item.id ? "volume-high" : "volume-medium-outline"}
                      size={20}
                      color={speakingId === item.id ? "#fff" : Colors.primary[400]}
                    />
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={s.removeBtn}
                  onPress={() => handleRemoveItem(item)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Remove from list"
                >
                  <Ionicons name="close" size={18} color={Colors.dark.textMuted} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={s.emptyBox}>
                <Ionicons name="folder-open-outline" size={48} color={Colors.dark.border} />
                <Text style={s.emptyText}>This list is empty.</Text>
                <Text style={s.emptySub}>
                  Add learning content or save listening mistakes to start practising.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  header: {
    marginBottom: Spacing.md,
  },
  headerGradient: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: BorderRadius["3xl"],
    borderBottomRightRadius: BorderRadius["3xl"],
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 28,
    fontWeight: FontWeight.black,
    color: "#fff",
  },
  smartTitle: {
    color: "#FCA5A5",
  },
  smartBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF444420",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  smartBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FCA5A5",
    marginLeft: 4,
  },
  headerSubtitle: {
    fontSize: FontSize.base,
    color: Colors.primary[200],
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xl,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  studyBtn: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  studyBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  studyBtnText: {
    color: "#fff",
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  listeningBtn: {
    minHeight: 64,
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: "rgba(251,113,133,0.4)",
    backgroundColor: "rgba(251,113,133,0.12)",
  },
  listeningIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251,113,133,0.18)",
  },
  listeningTitle: {
    color: "#fff",
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  listeningMeta: {
    color: Colors.primary[200],
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: Spacing["4xl"],
    gap: Spacing.md,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.card,
    padding: Spacing.md,
    // Room at the top-right for the absolutely positioned remove button.
    paddingRight: Spacing["2xl"],
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  itemTypeBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.dark.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
    alignSelf: "flex-start",
  },
  itemTypeEmoji: {
    fontSize: 20,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemPrimaryRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  itemPrimary: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
  },
  itemReading: {
    fontSize: FontSize.base,
    color: Colors.primary[300],
    fontWeight: FontWeight.semibold,
  },
  itemRomaji: {
    fontSize: FontSize.sm,
    color: Colors.dark.textMuted,
    fontWeight: FontWeight.medium,
  },
  itemEnglish: {
    fontSize: FontSize.sm,
    color: Colors.dark.textSecondary,
  },
  itemHindi: {
    fontSize: FontSize.sm,
    color: Colors.accent[300],
  },
  masteryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: 4,
  },
  masteryTrack: {
    flex: 1,
    maxWidth: 120,
    height: 6,
    backgroundColor: Colors.dark.surface,
    borderRadius: 3,
    overflow: "hidden",
  },
  masteryFill: {
    height: "100%",
    borderRadius: 3,
  },
  masteryText: {
    fontSize: 10,
    fontWeight: "bold",
    color: Colors.dark.textMuted,
  },
  audioBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary[500] + "1A",
    borderWidth: 1,
    borderColor: Colors.primary[500] + "40",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: Spacing.sm,
    alignSelf: "center",
  },
  audioBtnActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  removeBtn: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    padding: 4,
  },
  emptyBox: {
    alignItems: "center",
    padding: Spacing["3xl"],
    marginTop: Spacing["2xl"],
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySub: {
    fontSize: FontSize.sm,
    color: Colors.dark.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
});
