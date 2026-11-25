import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PracticeList } from "@japangolearn/database";
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import type { ExamQuestion } from "@/lib/exam-content";
import { getListeningPracticeItemId } from "@/lib/exam-content";
import { addListeningMistakesToList } from "@/lib/listening-practice";
import { supabase } from "@/lib/supabase";

type Props = {
  visible: boolean;
  questions: readonly ExamQuestion[];
  onClose: () => void;
  onSaved: (count: number, listTitle: string) => void;
};

export function ListeningMistakeListModal({ visible, questions, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [lists, setLists] = useState<PracticeList[]>([]);
  const [existingByList, setExistingByList] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [savingListId, setSavingListId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newListTitle, setNewListTitle] = useState("Listening mistakes");

  const loadLists = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("practice_lists")
      .select("id, title, is_smart_list, sort_order")
      .eq("user_id", user.id)
      .order("is_smart_list", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      setLoading(false);
      Alert.alert("Could not load lists", "Check your connection and try again.");
      return;
    }
    const loadedLists = (data ?? []) as PracticeList[];
    setLists(loadedLists);

    const itemIds = questions
      .map((question) => getListeningPracticeItemId(question.id))
      .filter((itemId): itemId is number => itemId !== undefined);
    if (loadedLists.length && itemIds.length) {
      const { data: memberships } = await supabase
        .from("practice_list_items")
        .select("list_id, item_id")
        .eq("item_type", "listening")
        .in("item_id", itemIds)
        .in(
          "list_id",
          loadedLists.map((list) => list.id)
        );
      const counts: Record<string, number> = {};
      for (const membership of memberships ?? []) {
        counts[membership.list_id] = (counts[membership.list_id] ?? 0) + 1;
      }
      setExistingByList(counts);
    } else {
      setExistingByList({});
    }
    setLoading(false);
  }, [questions, user?.id]);

  useEffect(() => {
    if (visible) void loadLists();
  }, [loadLists, visible]);

  const saveToList = async (list: PracticeList) => {
    setSavingListId(list.id);
    const result = await addListeningMistakesToList(supabase, list.id, questions);
    setSavingListId(null);
    if (!result.ok) {
      Alert.alert("Could not save mistakes", result.message);
      return;
    }
    const newlyAdded = Math.max(0, result.addedCount - (existingByList[list.id] ?? 0));
    onSaved(newlyAdded, list.title);
  };

  const createAndSave = async () => {
    if (!user?.id || !newListTitle.trim()) return;
    setSavingListId("new");
    const { data, error } = await supabase
      .from("practice_lists")
      .insert({
        user_id: user.id,
        title: newListTitle.trim(),
        is_smart_list: false,
        sort_order: lists.length + 1,
      })
      .select("id, title, is_smart_list, sort_order")
      .single();
    if (error || !data) {
      setSavingListId(null);
      Alert.alert("Could not create list", "Check your connection and try again.");
      return;
    }
    const result = await addListeningMistakesToList(supabase, data.id, questions);
    setSavingListId(null);
    if (!result.ok) {
      Alert.alert(
        "List created",
        `The list was created, but the mistakes were not added: ${result.message}`
      );
      return;
    }
    onSaved(result.addedCount, data.title);
  };

  if (!visible || !user) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>LISTENING REVIEW</Text>
              <Text style={styles.title}>
                Save {questions.length} mistake{questions.length === 1 ? "" : "s"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color={Colors.dark.text} />
            </TouchableOpacity>
          </View>

          {showCreate ? (
            <View style={styles.createCard}>
              <TextInput
                value={newListTitle}
                onChangeText={setNewListTitle}
                style={styles.input}
                placeholder="List name"
                placeholderTextColor={Colors.dark.textMuted}
                maxLength={30}
                autoFocus
              />
              <View style={styles.createActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCreate(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => void createAndSave()}
                  disabled={!newListTitle.trim() || savingListId !== null}
                >
                  {savingListId === "new" ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveText}>Create & save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.createRow} onPress={() => setShowCreate(true)}>
              <View style={styles.addIcon}>
                <Ionicons name="add" size={20} color={Colors.primary[300]} />
              </View>
              <Text style={styles.createText}>Create a listening list</Text>
            </TouchableOpacity>
          )}

          {loading ? (
            <ActivityIndicator color={Colors.primary[300]} style={{ padding: Spacing.xl }} />
          ) : (
            <FlatList
              data={lists}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={{ paddingBottom: Spacing.xl }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Create your first list to save these mistakes.</Text>
              }
              renderItem={({ item }) => {
                const existing = existingByList[item.id] ?? 0;
                return (
                  <TouchableOpacity
                    style={styles.listRow}
                    onPress={() => void saveToList(item)}
                    disabled={savingListId !== null}
                  >
                    <View style={styles.listIcon}>
                      <Ionicons
                        name={item.is_smart_list ? "flame" : "list"}
                        size={19}
                        color={item.is_smart_list ? "#F87171" : Colors.primary[300]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.listTitle}>{item.title}</Text>
                      <Text style={styles.listMeta}>
                        {existing ? `${existing} already saved` : "Ready to add"}
                      </Text>
                    </View>
                    {savingListId === item.id ? (
                      <ActivityIndicator size="small" color={Colors.primary[300]} />
                    ) : (
                      <Ionicons name="add-circle-outline" size={23} color={Colors.dark.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, justifyContent: "flex-end", zIndex: 1200 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.72)" },
  sheet: {
    maxHeight: "82%",
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.borderLight,
    alignSelf: "center",
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: {
    color: Colors.sakura[300],
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.2,
  },
  title: {
    color: Colors.dark.text,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginTop: 3,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  createRow: {
    minHeight: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.primary[500]}55`,
    backgroundColor: `${Colors.primary[500]}12`,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  addIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: `${Colors.primary[500]}24`,
    alignItems: "center",
    justifyContent: "center",
  },
  createText: { color: Colors.primary[300], fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  createCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.dark.surface,
    gap: Spacing.md,
  },
  input: {
    minHeight: 46,
    color: Colors.dark.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.borderLight,
    fontSize: FontSize.base,
  },
  createActions: { flexDirection: "row", justifyContent: "flex-end", gap: Spacing.sm },
  cancelButton: {
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: Colors.dark.textSecondary, fontWeight: FontWeight.semibold },
  saveButton: {
    minHeight: 44,
    minWidth: 120,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: "#fff", fontWeight: FontWeight.bold },
  list: { maxHeight: 390 },
  listRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  listTitle: { color: Colors.dark.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  listMeta: { color: Colors.dark.textMuted, fontSize: FontSize.xs, marginTop: 3 },
  emptyText: {
    color: Colors.dark.textMuted,
    textAlign: "center",
    padding: Spacing.xl,
    lineHeight: 19,
  },
});
