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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import { useFocusEffect } from "@react-navigation/native";
import type { PracticeList } from "@japangolearn/database";

export default function PracticeHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();

  const [lists, setLists] = useState<PracticeList[]>([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (session?.user) {
        loadData();
      }
    }, [session])
  );

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadLists(), loadStreak()]);
    setLoading(false);
  };

  const loadStreak = async () => {
    const { data } = await supabase
      .from("user_streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", session!.user.id)
      .single();

    if (data) {
      setStreak({ current: data.current_streak, longest: data.longest_streak });
    }
  };

  const loadLists = async () => {
    // 1. Get lists
    let { data: listsData } = await supabase
      .from("practice_lists")
      .select("id, title, is_smart_list")
      .eq("user_id", session!.user.id)
      .order("is_smart_list", { ascending: false })
      .order("created_at", { ascending: false });

    if (!listsData || listsData.length === 0) {
      // Auto-create Needs Practice list if it doesn't exist
      const { data: smartList } = await supabase
        .from("practice_lists")
        .insert({
          user_id: session!.user.id,
          title: "Needs Practice",
          is_smart_list: true,
        })
        .select()
        .single();

      if (smartList) listsData = [smartList];
    }

    if (listsData) {
      // 2. Get item counts for each list
      const listsWithCounts = await Promise.all(
        listsData.map(async (list) => {
          const { count } = await supabase
            .from("practice_list_items")
            .select("*", { count: "exact", head: true })
            .eq("list_id", list.id);

          return { ...list, item_count: count || 0 };
        })
      );
      setLists(listsWithCounts);
    }
  };

  const handleDeleteList = (listId: string, isSmartList: boolean) => {
    if (isSmartList) {
      Alert.alert("Cannot Delete", "The 'Needs Practice' auto-generated list cannot be deleted.");
      return;
    }

    Alert.alert(
      "Delete List",
      "Are you sure you want to delete this list? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await supabase.from("practice_lists").delete().eq("id", listId);
            setLists(lists.filter((l) => l.id !== listId));
          },
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={s.header}>
      <LinearGradient
        colors={[Colors.primary[800], "#1E0A4E"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.headerGradient}
      >
        <Text style={s.headerTitle}>Practice Hub</Text>
        <Text style={s.headerSubtitle}>Master your vocabulary</Text>

        <View style={s.streakRow}>
          <View style={s.streakCard}>
            <Text style={s.streakEmoji}>🔥</Text>
            <View>
              <Text style={s.streakValue}>{streak.current} Days</Text>
              <Text style={s.streakLabel}>Current Streak</Text>
            </View>
          </View>
          <View style={s.streakCard}>
            <Text style={s.streakEmoji}>🏆</Text>
            <View>
              <Text style={s.streakValue}>{streak.longest} Days</Text>
              <Text style={s.streakLabel}>Longest Streak</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {renderHeader()}

      <View style={s.content}>
        <View style={s.listHeaderRow}>
          <Text style={s.sectionTitle}>My Study Lists</Text>
        </View>

        {loading ? (
          <View style={s.centerBox}>
            <ActivityIndicator size="large" color={Colors.primary[400]} />
          </View>
        ) : (
          <FlatList
            data={lists}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={s.listCard}
                onPress={() => router.push(`/(tabs)/practice/${item.id}`)}
                activeOpacity={0.7}
              >
                <View style={[s.listIconBox, item.is_smart_list && s.smartListIconBox]}>
                  <Ionicons
                    name={item.is_smart_list ? "flame" : "list"}
                    size={24}
                    color={item.is_smart_list ? "#EF4444" : Colors.primary[300]}
                  />
                </View>

                <View style={s.listInfo}>
                  <Text style={[s.listName, item.is_smart_list && s.smartListName]}>
                    {item.title}
                  </Text>
                  <Text style={s.listCount}>{item.item_count} items</Text>
                </View>

                {!item.is_smart_list ? (
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => handleDeleteList(item.id, item.is_smart_list)}
                    hitSlop={10}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.dark.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={Colors.dark.textMuted}
                    style={{ marginRight: 10 }}
                  />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={s.emptyBox}>
                <Ionicons name="document-text-outline" size={48} color={Colors.dark.border} />
                <Text style={s.emptyText}>No practice lists yet.</Text>
                <Text style={s.emptySub}>
                  Add words from the Vocabulary or Writing tabs or create one here.
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
    marginBottom: Spacing.xl,
  },
  headerGradient: {
    padding: Spacing.xl,
    borderBottomLeftRadius: BorderRadius["3xl"],
    borderBottomRightRadius: BorderRadius["3xl"],
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: FontWeight.black,
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: FontSize.base,
    color: Colors.primary[200],
    fontWeight: FontWeight.medium,
    marginBottom: Spacing["2xl"],
  },
  streakRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  streakCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
  },
  streakEmoji: {
    fontSize: 24,
  },
  streakValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: "#fff",
  },
  streakLabel: {
    fontSize: FontSize.xs,
    color: Colors.primary[200],
    fontWeight: FontWeight.medium,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  listHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
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
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.card,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  listIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary[900] + "40",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  smartListIconBox: {
    backgroundColor: "#EF444420",
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  smartListName: {
    color: "#FCA5A5",
  },
  listCount: {
    fontSize: FontSize.sm,
    color: Colors.dark.textMuted,
    fontWeight: FontWeight.medium,
  },
  deleteBtn: {
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
