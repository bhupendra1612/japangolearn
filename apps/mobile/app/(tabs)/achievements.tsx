import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";

type UserAchievement = {
  id: string;
  achievement_id: string;
  unlocked_at: string | null;
};

// All available achievements (we fetch this to show unearned ones too)
type AchievementDef = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  xp_reward: number | null;
  category: string;
};

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const [earned, setEarned] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<AchievementDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalXp, setTotalXp] = useState(0);

  const fetchData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const [profileResult, definitionsResult, earnedResult] = await Promise.all([
        supabase.from("profiles").select("xp").eq("id", session.user.id).single(),
        supabase
          .from("achievements")
          .select("id, name, description, icon, xp_reward, category")
          .order("xp_reward", { ascending: true }),
        supabase
          .from("user_achievements")
          .select("id, achievement_id, unlocked_at")
          .eq("user_id", session.user.id),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (definitionsResult.error) throw definitionsResult.error;
      if (earnedResult.error) throw earnedResult.error;

      setTotalXp(profileResult.data.xp ?? 0);
      setAllAchievements(definitionsResult.data ?? []);
      setEarned(
        (earnedResult.data ?? []).filter(
          (achievement): achievement is UserAchievement => achievement.achievement_id !== null
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getEmojiIcon = (iconName: string) => {
    // Map some string names to emojis, or fallback
    const map: Record<string, string> = {
      flame: "🔥",
      star: "⭐",
      trophy: "🏆",
      book: "📖",
      pencil: "✏️",
      medal: "🎖️",
      crown: "👑",
      rocket: "🚀",
    };
    return map[iconName] || iconName || "💎";
  };

  const earnedIds = new Set(earned.map((achievement) => achievement.achievement_id));

  const renderHeader = () => (
    <View style={s.heroContainer}>
      <LinearGradient
        colors={[Colors.primary[600], Colors.primary[900]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.heroCard}
      >
        <Ionicons name="trophy" size={48} color={Colors.gold[400]} />
        <Text style={s.heroTitle}>Achievements</Text>
        <Text style={s.heroTotalXp}>{totalXp} XP</Text>
      </LinearGradient>
    </View>
  );

  const renderItem = ({ item }: { item: AchievementDef }) => {
    const isEarned = earnedIds.has(item.id);
    const earnedObj = earned.find((achievement) => achievement.achievement_id === item.id);
    const dateStr = earnedObj?.unlocked_at
      ? new Date(earnedObj.unlocked_at).toLocaleDateString()
      : "Locked";

    return (
      <View style={[s.card, !isEarned && s.cardLocked]}>
        <View style={[s.iconBox, !isEarned && s.iconBoxLocked]}>
          <Text style={[s.iconEmoji, !isEarned && s.iconEmojiLocked]}>
            {getEmojiIcon(item.icon)}
          </Text>
        </View>
        <View style={s.cardContent}>
          <Text style={[s.title, !isEarned && s.titleLocked]}>{item.name}</Text>
          <Text style={s.desc}>
            {item.description ?? "Complete the challenge to unlock this badge."}
          </Text>
          <View style={s.metaRow}>
            <View style={s.xpBadge}>
              <Text style={s.xpText}>+{item.xp_reward ?? 0} XP</Text>
            </View>
            <Text style={s.dateText}>{isEarned ? `Earned ${dateStr}` : "Not yet earned"}</Text>
          </View>
        </View>
        {isEarned && (
          <View style={s.checkMark}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.accent[400]} />
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" color={Colors.primary[400]} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <FlatList
        data={allAchievements}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + Spacing["4xl"] }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary[400]}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🏆</Text>
            <Text style={s.emptyText}>No achievements available yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  heroContainer: {
    marginBottom: Spacing.xl,
  },
  heroCard: {
    padding: Spacing["3xl"],
    borderRadius: BorderRadius["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: FontSize["2xl"],
    fontWeight: FontWeight.bold,
    color: "#fff",
    marginTop: Spacing.md,
  },
  heroTotalXp: {
    fontSize: FontSize.lg,
    color: Colors.gold[300],
    fontWeight: "600",
    marginTop: Spacing.xs,
  },
  card: {
    flexDirection: "row",
    backgroundColor: Colors.dark.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingRight: Spacing.xl,
  },
  cardLocked: {
    opacity: 0.6,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary[900],
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.lg,
  },
  iconBoxLocked: {
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  iconEmoji: {
    fontSize: 32,
  },
  iconEmojiLocked: {
    opacity: 0.3,
  },
  cardContent: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  titleLocked: {
    color: Colors.dark.textSecondary,
  },
  desc: {
    fontSize: FontSize.sm,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  xpBadge: {
    backgroundColor: Colors.dark.bg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  xpText: {
    fontSize: FontSize.xs,
    fontWeight: "bold",
    color: Colors.gold[400],
  },
  dateText: {
    fontSize: FontSize.xs,
    color: Colors.dark.textMuted,
  },
  checkMark: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
  },
  empty: {
    alignItems: "center",
    paddingTop: Spacing["5xl"],
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    color: Colors.dark.textMuted,
    fontSize: FontSize.base,
  },
});
