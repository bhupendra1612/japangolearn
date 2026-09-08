import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import type { PracticeItemType, PracticeList } from "@japangolearn/database";
import type { PracticeStudyItem } from "@japangolearn/core";
import { addPracticeListItemWithQueue, createPracticeListWithQueue } from "@/lib/offline-queue";
import { readCache, updateCache, writeCache } from "@/lib/offline-cache";

type AddToListModalProps = {
  visible: boolean;
  onClose: () => void;
  itemType: PracticeItemType;
  itemId: number;
  itemTitle: string; // To show in the UI what we are adding
  studyItem?: PracticeStudyItem;
};

export function AddToListModal({
  visible,
  onClose,
  itemType,
  itemId,
  itemTitle,
  studyItem,
}: AddToListModalProps) {
  const { session } = useAuth();
  const [lists, setLists] = useState<PracticeList[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [savingToList, setSavingToList] = useState<string | null>(null);
  const pendingStudyItem = studyItem
    ? {
        ...studyItem,
        listItemId: `pending:${itemType}:${itemId}`,
        itemId: String(itemId),
        masteryScore: 0,
        lastReviewed: null,
      }
    : null;

  const loadLists = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) return;
    setLoading(true);
    setLists([]);
    // Fetch user's lists, ensuring the smart list exists
    const cacheKey = `practice-list-picker:${userId}`;
    const isStillCurrentUser = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      return currentSession?.user.id === userId;
    };
    let { data, error } = await supabase
      .from("practice_lists")
      .select("id, title, is_smart_list")
      .eq("user_id", userId)
      .order("is_smart_list", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      const cached = await readCache<PracticeList[]>(cacheKey);
      if (cached && (await isStillCurrentUser())) setLists(cached.data);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      // Auto-create Needs Practice list
      const result = await createPracticeListWithQueue(supabase, {
        title: "Needs Practice",
        isSmartList: true,
        sortOrder: 1,
        expectedUserId: userId,
      });
      if (result.status !== "failed" && result.data) {
        if (!(await isStillCurrentUser())) {
          setLoading(false);
          return;
        }
        data = [result.data as PracticeList];
        void updateCache<PracticeList[]>(`practice-lists:${userId}`, (current) => [
          { ...(result.data as PracticeList), item_count: 0 },
          ...(current ?? []).filter((list) => list.id !== result.data?.id),
        ]);
      }
    }

    if (data && (await isStillCurrentUser())) {
      setLists(data);
      void writeCache(cacheKey, data);
    }
    setLoading(false);
  }, [session?.user.id]);

  useEffect(() => {
    if (visible) {
      void loadLists();
    }
  }, [visible, loadLists]);

  const handleCreateList = async () => {
    if (!newListTitle.trim() || !session?.user) return;
    setSavingToList("new");

    const result = await createPracticeListWithQueue(supabase, {
      title: newListTitle.trim(),
      sortOrder: lists.length + 1,
      expectedUserId: session.user.id,
    });

    if (result.status === "failed" || !result.data) {
      Alert.alert("Could not create list", "Please try again when you are connected.");
    } else {
      const createdList = result.data as PracticeList;
      setLists((previous) => [createdList, ...previous]);
      void updateCache<PracticeList[]>(`practice-list-picker:${session.user.id}`, (current) => [
        createdList,
        ...(current ?? lists).filter((list) => list.id !== createdList.id),
      ]);
      const addResult = await addPracticeListItemWithQueue(supabase, {
        listId: createdList.id,
        itemType,
        itemId,
        expectedUserId: session.user.id,
      });
      if (addResult.status === "failed") {
        Alert.alert(
          "Could not save item",
          "The new list was created, but this item was not added."
        );
      } else {
        void updateCache<PracticeList[]>(`practice-lists:${session.user.id}`, (current) => [
          { ...createdList, item_count: 1 },
          ...(current ?? []).filter((list) => list.id !== createdList.id),
        ]);
        void writeCache<PracticeList>(`practice-list:${session.user.id}:${createdList.id}`, {
          ...createdList,
          item_count: 1,
        });
        if (pendingStudyItem) {
          void writeCache(`practice-study:${session.user.id}:${createdList.id}`, [
            pendingStudyItem,
          ]);
        }
        onClose();
      }
    }

    setNewListTitle("");
    setIsCreating(false);
    setSavingToList(null);
  };

  const handleAddToList = async (listId: string) => {
    const userId = session?.user.id;
    if (savingToList || !userId) return;
    setSavingToList(listId);

    const result = await addPracticeListItemWithQueue(supabase, {
      listId,
      itemType,
      itemId,
      expectedUserId: userId,
    });
    if (result.status === "failed") {
      Alert.alert("Could not save item", "Please try again when you are connected.");
    } else {
      const cachedStudy = await readCache<PracticeStudyItem[]>(
        `practice-study:${userId}:${listId}`
      );
      const alreadyInCachedStudy = cachedStudy?.data.some(
        (item) => item.itemType === itemType && Number(item.itemId) === itemId
      );
      if (pendingStudyItem && !alreadyInCachedStudy) {
        void updateCache<PracticeStudyItem[]>(`practice-study:${userId}:${listId}`, (current) => [
          ...(current ?? []),
          pendingStudyItem,
        ]);
      }
      if ((cachedStudy || pendingStudyItem) && !alreadyInCachedStudy) {
        void updateCache<PracticeList[]>(`practice-lists:${userId}`, (current) => {
          if (!current) return undefined;
          return current.map((list) =>
            list.id === listId ? { ...list, item_count: (list.item_count ?? 0) + 1 } : list
          );
        });
      }
      onClose();
    }

    setSavingToList(null);
  };

  if (!visible || !session?.user) return null;

  return (
    <View style={s.overlay}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.modalContainer}
      >
        <View style={s.modalContent}>
          <View style={s.header}>
            <Text style={s.title}>Add to List</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={Colors.dark.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={s.itemGlow}>"{itemTitle}"</Text>

          {isCreating ? (
            <View style={s.createBox}>
              <TextInput
                style={s.input}
                placeholder="List Name (e.g., Monday Verbs)"
                placeholderTextColor={Colors.dark.textMuted}
                value={newListTitle}
                onChangeText={setNewListTitle}
                autoFocus
                maxLength={30}
              />
              <View style={s.createActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setIsCreating(false)}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, !newListTitle.trim() && { opacity: 0.5 }]}
                  onPress={handleCreateList}
                  disabled={!newListTitle.trim() || savingToList !== null}
                >
                  {savingToList === "new" ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.saveText}>Create & Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={s.createListBtn}
              onPress={() => setIsCreating(true)}
              activeOpacity={0.7}
            >
              <View style={s.createIconBox}>
                <Ionicons name="add" size={20} color={Colors.primary[400]} />
              </View>
              <Text style={s.createText}>Create New List</Text>
            </TouchableOpacity>
          )}

          {loading ? (
            <ActivityIndicator size="small" color={Colors.primary[400]} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={lists}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={s.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.listItem}
                  onPress={() => handleAddToList(item.id)}
                  activeOpacity={0.7}
                  disabled={savingToList !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`Add to list ${item.title}`}
                  accessibilityState={{ disabled: savingToList !== null }}
                >
                  <View style={[s.listIconBox, item.is_smart_list && s.smartListIconBox]}>
                    <Ionicons
                      name={item.is_smart_list ? "flame" : "list"}
                      size={18}
                      color={item.is_smart_list ? "#EF4444" : Colors.dark.text}
                    />
                  </View>
                  <Text style={[s.listName, item.is_smart_list && s.smartListName]}>
                    {item.title}
                  </Text>
                  {savingToList === item.id ? (
                    <ActivityIndicator size="small" color={Colors.primary[400]} />
                  ) : (
                    <Ionicons name="add-circle-outline" size={22} color={Colors.dark.textMuted} />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContainer: {
    width: "100%",
  },
  modalContent: {
    backgroundColor: Colors.dark.card,
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
    paddingBottom: Spacing["4xl"],
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
  },
  itemGlow: {
    fontSize: FontSize.base,
    color: Colors.primary[300],
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },
  createListBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    backgroundColor: Colors.primary[900] + "40",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary[700] + "50",
    marginBottom: Spacing.md,
  },
  createIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary[800] + "80",
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  createText: {
    fontSize: FontSize.base,
    color: Colors.primary[300],
    fontWeight: FontWeight.bold,
  },
  createBox: {
    backgroundColor: Colors.dark.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  input: {
    color: Colors.dark.text,
    fontSize: FontSize.base,
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    marginBottom: Spacing.md,
  },
  createActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  cancelText: {
    color: Colors.dark.textMuted,
    fontWeight: FontWeight.semibold,
  },
  saveBtn: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 100,
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontWeight: FontWeight.bold,
  },
  list: {
    maxHeight: 400,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  listIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.dark.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  smartListIconBox: {
    backgroundColor: "#EF444420",
  },
  listName: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.dark.text,
    fontWeight: FontWeight.medium,
  },
  smartListName: {
    color: "#FCA5A5",
    fontWeight: FontWeight.bold,
  },
});
