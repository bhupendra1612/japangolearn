import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import type { PracticeItemType, PracticeList } from "@japangolearn/database";

type AddToListModalProps = {
  visible: boolean;
  onClose: () => void;
  itemType: PracticeItemType;
  itemId: number;
  itemTitle: string; // To show in the UI what we are adding
};

export function AddToListModal({
  visible,
  onClose,
  itemType,
  itemId,
  itemTitle,
}: AddToListModalProps) {
  const { session } = useAuth();
  const [lists, setLists] = useState<PracticeList[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [savingToList, setSavingToList] = useState<string | null>(null);

  useEffect(() => {
    if (visible && session?.user) {
      loadLists();
    }
  }, [visible, session]);

  const loadLists = async () => {
    setLoading(true);
    // Fetch user's lists, ensuring the smart list exists
    let { data, error } = await supabase
      .from("practice_lists")
      .select("id, title, is_smart_list")
      .eq("user_id", session!.user.id)
      .order("is_smart_list", { ascending: false })
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) {
      // Auto-create Needs Practice list
      const { data: smartList } = await supabase
        .from("practice_lists")
        .insert({
          user_id: session!.user.id,
          title: "Needs Practice",
          is_smart_list: true,
        })
        .select()
        .single();

      if (smartList) {
        data = [smartList];
      }
    }

    if (data) setLists(data);
    setLoading(false);
  };

  const handleCreateList = async () => {
    if (!newListTitle.trim() || !session?.user) return;
    setSavingToList("new");

    const { data } = await supabase
      .from("practice_lists")
      .insert({
        user_id: session.user.id,
        title: newListTitle.trim(),
        is_smart_list: false,
      })
      .select()
      .single();

    if (data) {
      setLists([data, ...lists]);
      await handleAddToList(data.id);
    }

    setNewListTitle("");
    setIsCreating(false);
    setSavingToList(null);
  };

  const handleAddToList = async (listId: string) => {
    if (savingToList) return;
    setSavingToList(listId);

    // Check if it already exists
    const { data: existing } = await supabase
      .from("practice_list_items")
      .select("id")
      .eq("list_id", listId)
      .eq("item_type", itemType)
      .eq("item_id", itemId)
      .single();

    if (!existing) {
      await supabase.from("practice_list_items").insert({
        list_id: listId,
        item_type: itemType,
        item_id: itemId,
      });
    }

    setSavingToList(null);
    onClose();
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
