import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  RefreshControl,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import { AuthPromptModal } from "@/components/AuthPromptModal";
import { getXpLevelProgress } from "@japangolearn/content";

// ─── Constants ───

const DAILY_KANJI = [
  { kanji: "日", reading: "にち / ひ", meaning: "Day / Sun", detail: "Sunday" },
  { kanji: "月", reading: "げつ / つき", meaning: "Month / Moon", detail: "Monday" },
  { kanji: "火", reading: "か / ひ", meaning: "Fire", detail: "Tuesday" },
  { kanji: "水", reading: "すい / みず", meaning: "Water", detail: "Wednesday" },
  { kanji: "木", reading: "もく / き", meaning: "Tree / Wood", detail: "Thursday" },
  { kanji: "金", reading: "きん / かね", meaning: "Gold / Money", detail: "Friday" },
  { kanji: "土", reading: "ど / つち", meaning: "Earth / Soil", detail: "Saturday" },
];

const MOTIVATIONAL_QUOTES = [
  { jp: "七転び八起き", en: "Fall seven times, stand up eight" },
  { jp: "継続は力なり", en: "Continuity is strength" },
  { jp: "千里の道も一歩から", en: "A journey of 1000 miles begins with a single step" },
  { jp: "石の上にも三年", en: "Perseverance prevails" },
  { jp: "毎日少しずつ", en: "A little every day" },
  { jp: "努力は裏切らない", en: "Hard work never betrays you" },
  { jp: "一期一会", en: "Once in a lifetime encounter" },
];

const ACTIVITY_META: Record<string, { icon: string; color: string }> = {
  vocabulary: { icon: "📖", color: "#7C3AED" },
  grammar: { icon: "📝", color: "#0891B2" },
  kanji: { icon: "✍️", color: "#DB2777" },
  lesson: { icon: "📚", color: "#2563EB" },
  xp: { icon: "⭐", color: "#F59E0B" },
  streak: { icon: "🔥", color: "#F97316" },
  achievement: { icon: "🏆", color: "#10B981" },
  listening: { icon: "🎧", color: "#8B5CF6" },
  writing: { icon: "✏️", color: "#EC4899" },
};

function getGreeting(): { jp: string; en: string } {
  const h = new Date().getHours();
  if (h < 6) return { jp: "こんばんは", en: "Good evening" };
  if (h < 12) return { jp: "おはよう", en: "Good morning" };
  if (h < 18) return { jp: "こんにちは", en: "Good afternoon" };
  return { jp: "こんばんは", en: "Good evening" };
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// ─── Component ───

export default function DashboardHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, profile, session } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showPracticePrompt, setShowPracticePrompt] = useState(false);
  const [dailyGoal, setDailyGoal] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [achievementCount, setAchievementCount] = useState(0);
  const [weekActivity, setWeekActivity] = useState<Record<string, number>>({});
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);

    const [goalRes, actRes, achieveRes, weekRes] = await Promise.all([
      supabase
        .from("daily_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle(),
      supabase
        .from("activity_log")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("user_achievements").select("id").eq("user_id", user.id),
      supabase
        .from("activity_log")
        .select("created_at")
        .eq("user_id", user.id)
        .gte("created_at", weekAgo.toISOString()),
    ]);

    if (goalRes.data) setDailyGoal(goalRes.data);
    if (actRes.data) setActivities(actRes.data);
    if (achieveRes.data) setAchievementCount(achieveRes.data.length);

    if (weekRes.data) {
      const map: Record<string, number> = {};
      weekRes.data.forEach((a: any) => {
        const date = new Date(a.created_at).toISOString().split("T")[0];
        map[date] = (map[date] || 0) + 1;
      });
      setWeekActivity(map);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // ─── Derived values ───
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Learner";
  const xp = profile?.xp ?? 0;
  const streak = profile?.streak_days ?? 0;
  const xpLevel = getXpLevelProgress(xp);
  const jlptLevel = profile?.current_jlpt_level ?? "N5";
  const dailyProgress = dailyGoal ? Math.min(dailyGoal.xp_earned / dailyGoal.xp_target, 1) : 0;
  const dailyXpEarned = dailyGoal?.xp_earned ?? 0;
  const dailyXpTarget = dailyGoal?.xp_target ?? 100;
  const greeting = getGreeting();
  const todayKanji = DAILY_KANJI[new Date().getDay()];
  const quote = MOTIVATIONAL_QUOTES[new Date().getDate() % MOTIVATIONAL_QUOTES.length];

  // Week days for streak calendar
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return {
      date: dateStr,
      dayName: dayNames[d.getDay()],
      dayNum: d.getDate(),
      isToday: i === 6,
      count: weekActivity[dateStr] || 0,
    };
  });

  const quickActions = [
    { emoji: "📖", label: "Vocab", color: Colors.primary[600], tab: "vocabulary" },
    { emoji: "漢", label: "Kanji", color: "#DB2777", tab: "kanji" },
    { emoji: "📝", label: "Grammar", color: Colors.accent[600], tab: "grammar" },
    { emoji: "✍️", label: "Writing", color: Colors.sakura[500], tab: "writing" },
  ];

  return (
    <>
      <Animated.ScrollView
        style={[s.container, { opacity: fadeAnim }]}
        contentContainerStyle={[s.content, { paddingTop: insets.top + Spacing.sm }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary[400]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ Hero Banner ═══ */}
        <View style={s.heroBanner}>
          <LinearGradient
            colors={[Colors.primary[700], "#1E0A4E", Colors.primary[900]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroGradient}
          >
            {/* Decorative kanji */}
            <Text style={s.heroDecoL}>学</Text>
            <Text style={s.heroDecoR}>道</Text>

            {/* Avatar + Greeting */}
            <View style={s.heroTop}>
              <View style={s.heroGreetingCol}>
                <Text style={s.greeting}>{greeting.jp} 👋</Text>
                <Text style={s.heroName}>{displayName}</Text>
                <Text style={s.heroSubtitle}>Continue your Japanese journey</Text>
              </View>
              {profile?.avatar_url ? (
                <View style={s.avatarWrap}>
                  <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
                  <View style={s.lvBadge}>
                    <Text style={s.lvBadgeText}>Lv.{xpLevel.level}</Text>
                  </View>
                </View>
              ) : (
                <View style={s.avatarWrap}>
                  <View style={s.avatarPlaceholder}>
                    <Text style={s.avatarInitial}>{displayName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={s.lvBadge}>
                    <Text style={s.lvBadgeText}>Lv.{xpLevel.level}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Daily Progress */}
            <View style={s.dailySection}>
              <View style={s.dailyHeader}>
                <Text style={s.dailyTitle}>Daily Goal</Text>
                <Text style={s.dailyValue}>
                  {dailyXpEarned} / {dailyXpTarget} XP
                </Text>
              </View>
              <View style={s.dailyTrack}>
                <LinearGradient
                  colors={[Colors.primary[400], Colors.accent[400]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[s.dailyFill, { width: `${Math.round(dailyProgress * 100)}%` as any }]}
                />
              </View>
              {dailyProgress >= 1 && <Text style={s.dailyComplete}>Daily goal complete! 🎉</Text>}
            </View>
          </LinearGradient>
        </View>

        {/* ═══ Stats Grid ═══ */}
        <View style={s.statsGrid}>
          {[
            { icon: "⭐", label: "Total XP", value: xp.toLocaleString(), color: Colors.gold[500] },
            { icon: "🔥", label: "Streak", value: `${streak}d`, color: "#F97316" },
            { icon: "🎯", label: "JLPT", value: jlptLevel, color: Colors.primary[400] },
            { icon: "🏆", label: "Badges", value: `${achievementCount}`, color: "#10B981" },
          ].map((stat) => (
            <View key={stat.label} style={s.statCard}>
              <View style={[s.statIconBg, { backgroundColor: stat.color + "18" }]}>
                <Text style={s.statIcon}>{stat.icon}</Text>
              </View>
              <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ═══ Level Progress ═══ */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBg, { backgroundColor: Colors.gold[500] + "18" }]}>
              <Text style={s.cardIconEmoji}>📊</Text>
            </View>
            <Text style={s.cardTitle}>Level Progress</Text>
            <View style={s.levelPill}>
              <Text style={s.levelPillText}>Lv.{xpLevel.level}</Text>
            </View>
          </View>
          <View style={s.levelTrack}>
            <LinearGradient
              colors={[Colors.gold[400], Colors.gold[600]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[s.levelFill, { width: `${Math.round(xpLevel.progress * 100)}%` as any }]}
            />
          </View>
          <View style={s.levelLabels}>
            <Text style={s.levelLabelLeft}>
              {xpLevel.current} / {xpLevel.needed} XP to next level
            </Text>
            <Text style={s.levelLabelRight}>{Math.round(xpLevel.progress * 100)}%</Text>
          </View>
        </View>

        {/* ═══ Week Streak ═══ */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBg, { backgroundColor: "#F9731618" }]}>
              <Text style={s.cardIconEmoji}>🔥</Text>
            </View>
            <Text style={s.cardTitle}>This Week</Text>
            <Text style={s.cardBadgeText}>{streak} day streak</Text>
          </View>
          <View style={s.weekRow}>
            {weekDays.map((day) => {
              const active = day.count > 0;
              const intensity =
                day.count >= 5 ? 1 : day.count >= 2 ? 0.7 : day.count >= 1 ? 0.45 : 0;
              return (
                <View key={day.date} style={s.weekCol}>
                  <Text style={s.weekDayName}>{day.dayName}</Text>
                  <View
                    style={[
                      s.weekDot,
                      active && {
                        backgroundColor: `rgba(16,185,129,${intensity})`,
                        borderColor: "#10B981",
                      },
                      day.isToday && s.weekDotToday,
                    ]}
                  >
                    <Text style={[s.weekDotNum, active && { color: "#fff" }]}>{day.dayNum}</Text>
                  </View>
                  {active && <Text style={s.weekCount}>{day.count}</Text>}
                </View>
              );
            })}
          </View>
        </View>

        {/* ═══ My Vocab Practice ═══ */}
        <TouchableOpacity
          style={s.practiceCard}
          onPress={() => {
            if (session) {
              router.push("/(tabs)/practice");
            } else {
              setShowPracticePrompt(true);
            }
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[Colors.primary[800], Colors.primary[900]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.practiceGradient}
          >
            <View style={s.practiceLeft}>
              <View style={s.practiceIconBox}>
                <Text style={s.practiceIcon}>🎯</Text>
              </View>
              <View>
                <Text style={s.practiceTitle}>My Vocab Practice</Text>
                <Text style={s.practiceSub}>Review your custom lists</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={Colors.primary[300]} />
          </LinearGradient>
        </TouchableOpacity>

        {/* ═══ Kanji of the Day ═══ */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBg, { backgroundColor: Colors.sakura[500] + "18" }]}>
              <Text style={s.cardIconEmoji}>🎌</Text>
            </View>
            <Text style={s.cardTitle}>Kanji of the Day</Text>
            <Text style={s.cardBadgeText}>{todayKanji.detail}</Text>
          </View>
          <View style={s.kanjiRow}>
            <View style={s.kanjiBox}>
              <Text style={s.kanjiChar}>{todayKanji.kanji}</Text>
            </View>
            <View style={s.kanjiInfo}>
              <Text style={s.kanjiReading}>{todayKanji.reading}</Text>
              <Text style={s.kanjiMeaning}>{todayKanji.meaning}</Text>
              <View style={s.kanjiBadge}>
                <Text style={s.kanjiBadgeText}>JLPT N5</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ═══ Quick Actions ═══ */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBg, { backgroundColor: Colors.accent[500] + "18" }]}>
              <Text style={s.cardIconEmoji}>⚡</Text>
            </View>
            <Text style={s.cardTitle}>Quick Actions</Text>
          </View>
          <View style={s.actionsRow}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={s.actionItem}
                onPress={() => router.push(`/(tabs)/${action.tab}` as any)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[action.color, action.color + "CC"]}
                  style={s.actionIconBox}
                >
                  <Text style={s.actionEmoji}>{action.emoji}</Text>
                </LinearGradient>
                <Text style={s.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ═══ Recent Activity ═══ */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={[s.cardIconBg, { backgroundColor: Colors.primary[500] + "18" }]}>
              <Text style={s.cardIconEmoji}>📋</Text>
            </View>
            <Text style={s.cardTitle}>Recent Activity</Text>
          </View>
          {activities.length === 0 ? (
            <View style={s.emptyActivity}>
              <Text style={s.emptyEmoji}>🌱</Text>
              <Text style={s.emptyText}>Start learning to see activity here!</Text>
              <Text style={s.emptySubtext}>Complete vocabulary, grammar, or writing exercises</Text>
            </View>
          ) : (
            activities.slice(0, 6).map((act, i) => {
              const meta = ACTIVITY_META[act.type] || { icon: "📌", color: "#6B7280" };
              const isLast = i === Math.min(activities.length - 1, 5);
              return (
                <View key={act.id || i} style={[s.actItem, isLast && { borderBottomWidth: 0 }]}>
                  <View style={[s.actIconBg, { backgroundColor: meta.color + "18" }]}>
                    <Text style={s.actIcon}>{meta.icon}</Text>
                  </View>
                  <View style={s.actContent}>
                    <Text style={s.actTitle} numberOfLines={1}>
                      {act.title}
                    </Text>
                    <Text style={s.actTime}>{getTimeAgo(act.created_at)}</Text>
                  </View>
                  {act.xp_earned > 0 && (
                    <View style={s.xpBadge}>
                      <Text style={s.xpText}>+{act.xp_earned}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* ═══ Motivational Quote ═══ */}
        <View style={s.quoteCard}>
          <LinearGradient
            colors={[Colors.primary[800] + "60", Colors.dark.card]}
            style={s.quoteGradient}
          >
            <Text style={s.quoteDecor}>🌸</Text>
            <Text style={s.quoteJp}>{quote.jp}</Text>
            <Text style={s.quoteEn}>{quote.en}</Text>
          </LinearGradient>
        </View>

        <View style={{ height: 20 }} />
      </Animated.ScrollView>

      <AuthPromptModal
        visible={showPracticePrompt}
        feature="custom practice lists"
        redirectTo="/(tabs)/practice"
        description="Sign in to create lists, review flashcards, take quizzes, and save mastery progress."
        onClose={() => setShowPracticePrompt(false)}
      />
    </>
  );
}

// ════════════════════════ STYLES ════════════════════════

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },

  // ── Hero Banner ──
  heroBanner: {
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
  },
  heroGradient: {
    padding: Spacing.xl,
    position: "relative",
  },
  heroDecoL: {
    position: "absolute",
    left: 12,
    top: -10,
    fontSize: 90,
    color: "rgba(255,255,255,0.03)",
    fontWeight: FontWeight.bold,
  },
  heroDecoR: {
    position: "absolute",
    right: 12,
    bottom: -15,
    fontSize: 80,
    color: "rgba(255,255,255,0.03)",
    fontWeight: FontWeight.bold,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xl,
  },
  heroGreetingCol: { flex: 1, marginRight: Spacing.lg },
  greeting: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 4,
  },
  heroName: {
    fontSize: FontSize["3xl"],
    fontWeight: FontWeight.bold,
    color: "#fff",
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: FontSize.sm,
    color: "rgba(255,255,255,0.5)",
  },

  // Avatar
  avatarWrap: { position: "relative" },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  avatarInitial: { fontSize: 22, color: "#fff", fontWeight: FontWeight.bold },
  lvBadge: {
    position: "absolute",
    bottom: -6,
    right: -6,
    backgroundColor: Colors.gold[500],
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: Colors.primary[900],
  },
  lvBadgeText: { fontSize: 9, fontWeight: FontWeight.extrabold, color: "#fff" },

  // Daily progress
  dailySection: {},
  dailyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  dailyTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: "rgba(255,255,255,0.7)",
  },
  dailyValue: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: "rgba(255,255,255,0.5)",
  },
  dailyTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  dailyFill: { height: "100%", borderRadius: 4 },
  dailyComplete: {
    fontSize: FontSize.xs,
    color: Colors.accent[400],
    fontWeight: FontWeight.bold,
    marginTop: 6,
    textAlign: "center",
  },

  // ── Stats Grid ──
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  statIcon: { fontSize: 16 },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: 2 },
  statLabel: { fontSize: 10, color: Colors.dark.textMuted, fontWeight: FontWeight.semibold },

  // ── Card (shared) ──
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  cardIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cardIconEmoji: { fontSize: 14 },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    flex: 1,
  },
  cardBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.dark.textMuted,
    fontWeight: FontWeight.semibold,
  },

  // ── Level Progress ──
  levelPill: {
    backgroundColor: Colors.gold[500] + "20",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.gold[500] + "40",
  },
  levelPillText: { fontSize: 11, fontWeight: FontWeight.extrabold, color: Colors.gold[400] },
  levelTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.dark.surface,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  levelFill: { height: "100%", borderRadius: 5 },
  levelLabels: { flexDirection: "row", justifyContent: "space-between" },
  levelLabelLeft: { fontSize: FontSize.xs, color: Colors.dark.textMuted },
  levelLabelRight: { fontSize: FontSize.xs, color: Colors.gold[400], fontWeight: FontWeight.bold },

  // ── Week Streak ──
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weekCol: { alignItems: "center", flex: 1, gap: 4 },
  weekDayName: { fontSize: 10, color: Colors.dark.textMuted, fontWeight: FontWeight.semibold },
  weekDot: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.dark.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
  },
  weekDotToday: {
    borderColor: Colors.primary[500],
    borderWidth: 2,
  },
  weekDotNum: { fontSize: 12, fontWeight: FontWeight.bold, color: Colors.dark.textMuted },
  weekCount: { fontSize: 9, color: "#10B981", fontWeight: FontWeight.bold },

  // ── Kanji of the Day ──
  kanjiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
  },
  kanjiBox: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.dark.bg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.sakura[500] + "30",
  },
  kanjiChar: { fontSize: 48, fontWeight: FontWeight.bold, color: Colors.dark.text },
  kanjiInfo: { flex: 1 },
  kanjiReading: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.sakura[400],
    marginBottom: 4,
  },
  kanjiMeaning: {
    fontSize: FontSize.sm,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.sm,
  },
  kanjiBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primary[500] + "18",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary[500] + "40",
  },
  kanjiBadgeText: { fontSize: 10, fontWeight: FontWeight.bold, color: Colors.primary[400] },

  // ── Quick Actions ──
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionItem: { alignItems: "center", flex: 1 },
  actionIconBox: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  actionEmoji: { fontSize: 24 },
  actionLabel: {
    fontSize: FontSize.sm,
    color: Colors.dark.text,
    fontWeight: FontWeight.medium,
    marginTop: Spacing.xs,
  },

  practiceCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
    borderRadius: BorderRadius["2xl"],
    overflow: "hidden",
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  practiceGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.xl,
  },
  practiceLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  practiceIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  practiceIcon: {
    fontSize: 24,
  },
  practiceTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: "#fff",
    marginBottom: 2,
  },
  practiceSub: {
    fontSize: FontSize.sm,
    color: Colors.primary[200],
    fontWeight: FontWeight.medium,
  },

  // ── Recent Activity ──
  emptyActivity: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    gap: 6,
  },
  emptyEmoji: { fontSize: 36 },
  emptyText: {
    color: Colors.dark.textMuted,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  emptySubtext: { color: Colors.dark.textMuted, fontSize: FontSize.xs },

  actItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border + "60",
  },
  actIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  actIcon: { fontSize: 16 },
  actContent: { flex: 1 },
  actTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.dark.text },
  actTime: { fontSize: FontSize.xs, color: Colors.dark.textMuted, marginTop: 2 },
  xpBadge: {
    backgroundColor: Colors.gold[500] + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.gold[500] + "30",
  },
  xpText: { fontSize: FontSize.xs, color: Colors.gold[500], fontWeight: FontWeight.bold },

  // ── Quote Card ──
  quoteCard: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  quoteGradient: {
    padding: Spacing.xl,
    alignItems: "center",
    position: "relative",
  },
  quoteDecor: { fontSize: 28, marginBottom: Spacing.sm },
  quoteJp: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: 6,
  },
  quoteEn: {
    fontSize: FontSize.sm,
    color: Colors.dark.textMuted,
    textAlign: "center",
    fontStyle: "italic",
  },
});
