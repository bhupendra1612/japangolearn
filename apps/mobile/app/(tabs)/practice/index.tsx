import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import { useFocusEffect } from "@react-navigation/native";
import { LoadError } from "@/components/LoadError";
import { captureException } from "@/lib/monitoring";
import { reorderPracticeLists, type PracticeListOrderChange } from "@japangolearn/core";
import type { PracticeList } from "@japangolearn/database";

export default function PracticeHubScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();

  const [lists, setLists] = useState<PracticeList[]>([]);
  const [streak, setStreak] = useState({ current: 0, longest: 0 });
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [savingNew, setSavingNew] = useState(false);
  // When on, each row shows up/down controls instead of open/delete so the list
  // can be reordered by tapping. A tap-based control rather than a drag gesture,
  // because gesture/reanimated libraries do not run in Expo Go.
  const [reordering, setReordering] = useState(false);

  const loadData = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) return;
    setLoading(true);
    setLoadFailed(false);

    // maybeSingle, not single: a user who has never studied has no streak row,
    // and single() reports that absence as an error. This way a missing row is
    // just null and anything left really is a failure worth reporting.
    const { data, error: streakError } = await supabase
      .from("user_streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", userId)
      .maybeSingle();

    if (streakError) {
      captureException(streakError, { screen: "practice", query: "user_streaks" });
    } else if (data) {
      setStreak({ current: data.current_streak, longest: data.longest_streak });
    }

    // 1. Get lists
    let { data: listsData, error: listsError } = await supabase
      .from("practice_lists")
      .select("id, title, is_smart_list, sort_order")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (listsError) {
      setLoadFailed(true);
      captureException(listsError, { screen: "practice" });
      setLoading(false);
      return;
    }

    if (!listsData || listsData.length === 0) {
      // Auto-create Needs Practice list if it doesn't exist
      const { data: smartList } = await supabase
        .from("practice_lists")
        .insert({
          user_id: userId,
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
    setLoading(false);
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const handleCreateList = async () => {
    const userId = session?.user.id;
    const title = newListTitle.trim();
    if (!userId || !title || savingNew) return;
    setSavingNew(true);

    // A blank list, ready to have items added to it later. is_smart_list stays
    // false so it behaves like any user list (deletable, shown after the smart
    // list).
    // Place the new list after the ones that exist so it does not jump to the
    // top of the user's chosen order.
    const nextOrder = lists.reduce((max, l) => Math.max(max, l.sort_order ?? 0), 0) + 1;
    const { data, error } = await supabase
      .from("practice_lists")
      .insert({ user_id: userId, title, is_smart_list: false, sort_order: nextOrder })
      .select("id, title, is_smart_list, sort_order")
      .single();

    setSavingNew(false);
    if (error || !data) {
      captureException(error ?? new Error("create list returned no row"), {
        screen: "practice",
        action: "create_list",
      });
      Alert.alert("Could not create list", "Please try again.");
      return;
    }

    setLists((prev) => [...prev, { ...data, item_count: 0 }]);
    setNewListTitle("");
    setCreating(false);
    // Open the new list so the user can start adding to it right away.
    router.push(`/(tabs)/practice/${data.id}`);
  };

  const persistOrder = useCallback(async (changes: PracticeListOrderChange[]) => {
    // Write only rows whose position changed from the original order. A failed
    // write is reported but not surfaced — the next load re-reads stored order.
    if (changes.length === 0) return;
    const results = await Promise.all(
      changes.map((row) =>
        supabase.from("practice_lists").update({ sort_order: row.sortOrder }).eq("id", row.id)
      )
    );
    const failure = results.find((r) => r.error)?.error;
    if (failure) captureException(failure, { screen: "practice", action: "reorder" });
  }, []);

  const moveList = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      setLists((prev) => {
        if (target < 0 || target >= prev.length) return prev;
        const { ordered, changes } = reorderPracticeLists(prev, index, direction);
        void persistOrder(changes);
        return ordered;
      });
    },
    [persistOrder]
  );

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

  const renderListItem = ({ item, index }: { item: PracticeList; index: number }) => (
    <View style={s.listCard}>
      <TouchableOpacity
        style={s.listCardMain}
        onPress={() => router.push(`/(tabs)/practice/${item.id}`)}
        disabled={reordering}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Open list ${item.title}`}
      >
        <View style={[s.listIconBox, item.is_smart_list && s.smartListIconBox]}>
          <Ionicons
            name={item.is_smart_list ? "flame" : "list"}
            size={24}
            color={item.is_smart_list ? "#EF4444" : Colors.primary[300]}
          />
        </View>

        <View style={s.listInfo}>
          <Text style={[s.listName, item.is_smart_list && s.smartListName]}>{item.title}</Text>
          <Text style={s.listCount}>{item.item_count} items</Text>
        </View>
      </TouchableOpacity>

      {reordering ? (
        <View style={s.moveControls}>
          <TouchableOpacity
            style={[s.moveBtn, index === 0 && s.moveBtnDisabled]}
            onPress={() => moveList(index, -1)}
            disabled={index === 0}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Move ${item.title} up`}
          >
            <Ionicons
              name="chevron-up"
              size={22}
              color={index === 0 ? Colors.dark.border : Colors.primary[300]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.moveBtn, index === lists.length - 1 && s.moveBtnDisabled]}
            onPress={() => moveList(index, 1)}
            disabled={index === lists.length - 1}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Move ${item.title} down`}
          >
            <Ionicons
              name="chevron-down"
              size={22}
              color={index === lists.length - 1 ? Colors.dark.border : Colors.primary[300]}
            />
          </TouchableOpacity>
        </View>
      ) : !item.is_smart_list ? (
        <TouchableOpacity
          style={s.deleteBtn}
          onPress={() => handleDeleteList(item.id, item.is_smart_list)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Delete list ${item.title}`}
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
    </View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {renderHeader()}

      <View style={s.content}>
        <View style={s.listHeaderRow}>
          <Text style={s.sectionTitle}>My Study Lists</Text>
          <View style={s.headerActions}>
            {lists.length > 1 ? (
              <TouchableOpacity
                style={[s.headerBtn, reordering && s.headerBtnActive]}
                onPress={() => setReordering((v) => !v)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={reordering ? "Finish reordering" : "Reorder lists"}
              >
                <Ionicons
                  name={reordering ? "checkmark" : "swap-vertical"}
                  size={18}
                  color={reordering ? "#fff" : Colors.primary[300]}
                />
                <Text style={[s.headerBtnText, reordering && { color: "#fff" }]}>
                  {reordering ? "Done" : "Reorder"}
                </Text>
              </TouchableOpacity>
            ) : null}
            {!reordering ? (
              <TouchableOpacity
                style={s.headerBtn}
                onPress={() => {
                  setNewListTitle("");
                  setCreating(true);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Create a new practice list"
              >
                <Ionicons name="add" size={18} color={Colors.primary[300]} />
                <Text style={s.headerBtnText}>New List</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {loading ? (
          <View style={s.centerBox}>
            <ActivityIndicator size="large" color={Colors.primary[400]} />
          </View>
        ) : loadFailed ? (
          <LoadError
            onRetry={() => void loadData()}
            message="We could not load your practice lists."
          />
        ) : (
          <FlatList
            data={lists}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={renderListItem}
            ListHeaderComponent={
              reordering && lists.length > 1 ? (
                <Text style={s.reorderHint}>Use the arrows to change the order</Text>
              ) : null
            }
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

      <Modal
        visible={creating}
        transparent
        animationType="fade"
        onRequestClose={() => setCreating(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.createOverlay}
        >
          <TouchableOpacity
            style={s.createBackdrop}
            activeOpacity={1}
            onPress={() => setCreating(false)}
          />
          <View style={s.createCard}>
            <Text style={s.createTitle}>New practice list</Text>
            <TextInput
              style={s.createInput}
              placeholder="List name (e.g. Kitchen verbs)"
              placeholderTextColor={Colors.dark.textMuted}
              value={newListTitle}
              onChangeText={setNewListTitle}
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={() => void handleCreateList()}
            />
            <View style={s.createActions}>
              <TouchableOpacity
                style={s.createCancelBtn}
                onPress={() => setCreating(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={s.createCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.createConfirmBtn, !newListTitle.trim() && { opacity: 0.5 }]}
                onPress={() => void handleCreateList()}
                disabled={!newListTitle.trim() || savingNew}
                accessibilityRole="button"
                accessibilityLabel="Create list"
              >
                {savingNew ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.createConfirmText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary[500] + "1A",
    borderWidth: 1,
    borderColor: Colors.primary[500] + "40",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerBtnActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  headerBtnText: {
    color: Colors.primary[300],
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
  createOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  createBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  createCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  createTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    marginBottom: Spacing.lg,
  },
  createInput: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    color: Colors.dark.text,
    fontSize: FontSize.base,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
  },
  createActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
  },
  createCancelBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  createCancelText: {
    color: Colors.dark.textMuted,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.base,
  },
  createConfirmBtn: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    minWidth: 96,
    alignItems: "center",
  },
  createConfirmText: {
    color: "#fff",
    fontWeight: FontWeight.bold,
    fontSize: FontSize.base,
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
  reorderHint: {
    fontSize: FontSize.xs,
    color: Colors.dark.textMuted,
    marginBottom: Spacing.md,
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
  listCardMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  moveControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  moveBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary[500] + "14",
    justifyContent: "center",
    alignItems: "center",
  },
  moveBtnDisabled: {
    backgroundColor: "transparent",
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
