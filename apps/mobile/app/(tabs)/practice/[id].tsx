import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import { useFocusEffect } from "@react-navigation/native";
import type { PracticeItemType, PracticeList } from "@japangolearn/database";

type ListItem = {
  id: string; // The practice_list_items id
  item_type: PracticeItemType;
  item_id: number;
  mastery_score: number;
  last_reviewed: string | null;
  // Detail data joined from other tables
  content?: string; // e.g. kanji or hiragana for vocab, character for kana
  subContent?: string; // romaji or meaning
};

export default function PracticeListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();

  const [list, setList] = useState<PracticeList | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (session?.user && id) {
        loadData();
      }
    }, [session, id])
  );

  const loadData = async () => {
    setLoading(true);

    // 1. Load list details
    const { data: listData } = await supabase
      .from("practice_lists")
      .select("*")
      .eq("id", id)
      .single();

    if (listData) {
      setList(listData);
    }

    // 2. Load list items
    const { data: listItems } = await supabase
      .from("practice_list_items")
      .select("*")
      .eq("list_id", id)
      .order("created_at", { ascending: false });

    if (listItems && listItems.length > 0) {
      // 3. Fetch details for items (vocab and kana)
      const vocabIds = listItems.filter((i) => i.item_type === "vocabulary").map((i) => i.item_id);
      const kanaIds = listItems.filter((i) => i.item_type === "kana").map((i) => i.item_id);

      let vocabMap = new Map();
      let kanaMap = new Map();

      if (vocabIds.length > 0) {
        const { data: vocabData } = await supabase
          .from("vocabulary")
          .select("*")
          .in("id", vocabIds);
        vocabData?.forEach((v) => vocabMap.set(v.id, v));
      }

      if (kanaIds.length > 0) {
        const { data: kanaData } = await supabase.from("kana").select("*").in("id", kanaIds);
        kanaData?.forEach((k) => kanaMap.set(k.id, k));
      }

      // 4. Merge data
      const mergedItems = listItems.map((item) => {
        let content = "";
        let subContent = "";
        if (item.item_type === "vocabulary") {
          const v = vocabMap.get(item.item_id);
          if (v) {
            content = v.kanji || v.hiragana;
            subContent = v.english;
          }
        } else {
          const k = kanaMap.get(item.item_id);
          if (k) {
            content = k.character;
            subContent = k.romaji;
          }
        }
        return { ...item, content, subContent };
      });

      setItems(mergedItems);
    } else {
      setItems([]);
    }

    setLoading(false);
  };

  const handleRemoveItem = (itemId: string) => {
    Alert.alert("Remove Item", "Remove this item from the list?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await supabase.from("practice_list_items").delete().eq("id", itemId);
          setItems(items.filter((i) => i.id !== itemId));
        },
      },
    ]);
  };

  const startFlashcards = () => {
    if (items.length === 0) return;
    router.push({
      pathname: "/study/flashcards",
      params: { listId: id },
    });
  };

  const startQuiz = () => {
    if (items.length === 0) return;
    router.push({
      pathname: "/study/quiz",
      params: { listId: id },
    });
  };

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
            style={[s.studyBtn, items.length === 0 && { opacity: 0.5 }]}
            onPress={startFlashcards}
            disabled={items.length === 0}
            activeOpacity={0.8}
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
            style={[s.studyBtn, items.length === 0 && { opacity: 0.5 }]}
            onPress={startQuiz}
            disabled={items.length === 0}
            activeOpacity={0.8}
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
              <View style={s.itemCard}>
                <View style={s.itemTypeBox}>
                  <Text style={s.itemTypeEmoji}>
                    {item.item_type === "vocabulary" ? "📖" : "✍️"}
                  </Text>
                </View>

                <View style={s.itemInfo}>
                  <Text style={s.itemContent}>{item.content}</Text>
                  <Text style={s.itemSubContent} numberOfLines={1}>
                    {item.subContent}
                  </Text>
                </View>

                {/* Mastery Bar */}
                <View style={s.masteryWrapper}>
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

                <TouchableOpacity
                  style={s.removeBtn}
                  onPress={() => handleRemoveItem(item.id)}
                  hitSlop={10}
                >
                  <Ionicons name="close" size={20} color={Colors.dark.textMuted} />
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={s.emptyBox}>
                <Ionicons name="folder-open-outline" size={48} color={Colors.dark.border} />
                <Text style={s.emptyText}>This list is empty.</Text>
                <Text style={s.emptySub}>
                  Add words from the Vocabulary or Writing tabs to start practicing!
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
  },
  itemTypeEmoji: {
    fontSize: 20,
  },
  itemInfo: {
    flex: 1,
  },
  itemContent: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  itemSubContent: {
    fontSize: FontSize.sm,
    color: Colors.dark.textMuted,
    fontWeight: FontWeight.medium,
  },
  masteryWrapper: {
    alignItems: "flex-end",
    width: 60,
    marginRight: Spacing.md,
  },
  masteryTrack: {
    width: "100%",
    height: 6,
    backgroundColor: Colors.dark.surface,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
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
  removeBtn: {
    padding: Spacing.sm,
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
