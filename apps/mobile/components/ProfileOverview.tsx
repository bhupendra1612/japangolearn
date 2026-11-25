import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getXpLevelProgress } from "@japangolearn/content";
import { DAILY_GOAL_OPTIONS, type ProfileProgress } from "@/lib/profile-progress";

export const profilePalette = {
  bg: "#0C1423",
  card: "#152237",
  surface: "#1C2D45",
  border: "#2B405A",
  text: "#F3F6FD",
  muted: "#A0B1C8",
  teal: "#8CDECF",
  lavender: "#C4B8F0",
  blue: "#99C7FA",
  gold: "#EAC88F",
  pink: "#F0B3CE",
  danger: "#F5A8AF",
};
const c = profilePalette;
type Icon = React.ComponentProps<typeof Ionicons>["name"];
export type ProfileAction =
  | "edit"
  | "avatar"
  | "password"
  | "practice"
  | "achievements"
  | "history"
  | "downloads"
  | "about"
  | "support"
  | "privacy"
  | "terms"
  | "sign-out"
  | "delete";
export type ProfileOverviewProps = {
  name: string;
  email: string;
  avatarUrl?: string | null;
  memberSince: string;
  xp: number;
  streak: number;
  jlptLevel: string;
  topInset: number;
  version: string;
  progress: ProfileProgress | null;
  progressLoading: boolean;
  progressError: boolean;
  uploadingAvatar: boolean;
  deletingAccount: boolean;
  savingGoal: boolean;
  onAction: (action: ProfileAction) => void;
  onRetry: () => void;
  onSaveGoal: (goal: number) => Promise<boolean>;
};

function ActionRow({
  icon,
  color,
  title,
  detail,
  onPress,
  last = false,
  disabled = false,
}: {
  icon: Icon;
  color: string;
  title: string;
  detail: string;
  onPress: () => void;
  last?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[s.action, !last && s.divider, disabled && { opacity: 0.5 }]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={detail}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[s.iconBox, { backgroundColor: color + "16" }]}>
        <Ionicons name={icon} color={color} size={20} />
      </View>
      <View style={s.grow}>
        <Text style={s.actionTitle}>{title}</Text>
        <Text style={s.detail}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" color={c.muted} size={16} />
    </TouchableOpacity>
  );
}

function ProgressBar({
  progress,
  label,
  color = c.teal,
}: {
  progress: number;
  label: string;
  color?: string;
}) {
  const value = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <View
      style={s.track}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: value }}
    >
      <View style={[s.fill, { width: `${value}%`, backgroundColor: color }]} />
    </View>
  );
}

export function ProfileOverview(props: ProfileOverviewProps) {
  const { name, email, xp, streak, jlptLevel, progress, onAction } = props;
  const level = getXpLevelProgress(xp);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goal, setGoal] = useState(100);
  const dailyTarget = progress?.dailyTarget ?? 100;
  const dailyXp = progress?.dailyXp ?? 0;
  const activeDays = progress?.week.filter((day) => day.count > 0).length ?? 0;
  const goalComplete = progress !== null && dailyXp >= dailyTarget;
  const resetDate = new Date(progress?.updatedAt ?? "2026-01-01T00:00:00Z");
  resetDate.setUTCHours(24, 0, 0, 0);
  const resetTime = resetDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <View style={s.page}>
      <LinearGradient
        colors={["#243852", "#192A43", c.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: props.topInset + 58 }]}
      >
        <Text style={s.eyebrow}>YOUR LEARNING JOURNEY</Text>
        <View style={s.identity}>
          <TouchableOpacity
            onPress={() => onAction("avatar")}
            disabled={props.uploadingAvatar}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            style={s.avatarButton}
          >
            <View style={s.avatar}>
              {props.avatarUrl ? (
                <Image source={{ uri: props.avatarUrl }} style={StyleSheet.absoluteFill} />
              ) : (
                <Text style={s.initial}>{name[0]?.toUpperCase() ?? "L"}</Text>
              )}
              {props.uploadingAvatar && (
                <View style={s.avatarOverlay}>
                  <ActivityIndicator color={c.text} />
                </View>
              )}
            </View>
            <View style={s.camera}>
              <Ionicons name="camera" size={12} color={c.bg} />
            </View>
          </TouchableOpacity>
          <View style={s.grow}>
            <Text style={s.name} numberOfLines={2}>
              {name}
            </Text>
            <Text style={s.email} numberOfLines={1}>
              {email}
            </Text>
            <View style={s.chips}>
              <Text style={s.chip}>{jlptLevel} learner</Text>
              <Text style={s.levelChip}>Level {level.level}</Text>
            </View>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            onPress={() => onAction("edit")}
            style={s.editButton}
          >
            <Ionicons name="create-outline" size={21} color={c.lavender} />
          </TouchableOpacity>
        </View>
        <View style={s.levelRow}>
          <Text style={s.small}>{xp.toLocaleString()} total XP</Text>
          <Text style={s.small}>
            {level.needed - level.current} XP to level {level.level + 1}
          </Text>
        </View>
        <ProgressBar
          progress={level.progress}
          label={`Level ${level.level} progress`}
          color={c.lavender}
        />
      </LinearGradient>

      <View style={s.content}>
        <View style={s.stats}>
          {(
            [
              { icon: "flame", value: `${streak}`, label: "Day streak", color: c.gold },
              {
                icon: "calendar-outline",
                value: progress ? `${activeDays}/7` : "—",
                label: "Active days",
                color: c.teal,
              },
              {
                icon: "trophy-outline",
                value: progress ? `${progress.achievements}` : "—",
                label: "Trophies",
                color: c.pink,
              },
            ] satisfies { icon: Icon; value: string; label: string; color: string }[]
          ).map((item) => (
            <View
              key={item.label}
              style={s.stat}
              accessible
              accessibilityLabel={`${item.value} ${item.label}`}
            >
              <Ionicons name={item.icon} size={20} color={item.color} />
              <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {props.progressError && (
          <TouchableOpacity
            style={s.notice}
            onPress={props.onRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry loading learning progress"
          >
            <Ionicons name="cloud-offline-outline" size={19} color={c.gold} />
            <Text style={s.noticeText}>
              {progress
                ? "Progress couldn’t refresh. Tap to retry."
                : "Progress unavailable. Tap to retry."}
            </Text>
            <Ionicons name="refresh" size={17} color={c.gold} />
          </TouchableOpacity>
        )}

        <View style={s.card}>
          <View style={s.headingRow}>
            <View style={s.titleRow}>
              <Ionicons
                name={goalComplete ? "checkmark-circle" : "flag-outline"}
                size={20}
                color={c.teal}
              />
              <Text style={s.title}>Daily goal</Text>
            </View>
            <TouchableOpacity
              style={s.textButton}
              accessibilityRole="button"
              accessibilityLabel="Change daily XP goal"
              disabled={!progress || props.savingGoal}
              onPress={() => {
                setGoal(dailyTarget);
                setEditingGoal(!editingGoal);
              }}
            >
              <Text style={[s.textLink, !progress && { opacity: 0.4 }]}>
                {editingGoal ? "Close" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>
          {props.progressLoading && !progress ? (
            <ActivityIndicator
              style={s.loader}
              color={c.teal}
              accessibilityLabel="Loading progress"
            />
          ) : (
            <>
              <View style={s.goalNumbers}>
                <Text style={s.goalValue}>
                  {progress ? dailyXp : "—"}
                  <Text style={s.goalTarget}> / {progress ? dailyTarget : "—"} XP</Text>
                </Text>
                <Text style={s.goalStatus}>{goalComplete ? "Goal complete!" : "Keep growing"}</Text>
              </View>
              <ProgressBar progress={progress ? dailyXp / dailyTarget : 0} label="Daily XP goal" />
              <Text style={s.caption}>
                {progress
                  ? goalComplete
                    ? "Beautiful work. Every small step adds up."
                    : `${Math.max(0, dailyTarget - dailyXp)} XP to go. A short practice is a great start.`
                  : "Connect to see today’s progress."}
              </Text>
            </>
          )}
          {editingGoal && (
            <View style={s.goalEditor}>
              <Text style={s.detail}>Choose a daily pace you can keep.</Text>
              <View style={s.goalOptions}>
                {DAILY_GOAL_OPTIONS.map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[s.goalOption, goal === value && s.goalSelected]}
                    onPress={() => setGoal(value)}
                    disabled={props.savingGoal}
                    accessibilityRole="radio"
                    aria-checked={goal === value}
                    accessibilityLabel={`${value} XP per day`}
                    accessibilityState={{ checked: goal === value, disabled: props.savingGoal }}
                  >
                    <Text style={[s.optionValue, goal === value && { color: c.teal }]}>
                      {value}
                    </Text>
                    <Text style={s.detail}>XP</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[s.primary, props.savingGoal && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel="Save daily goal"
                disabled={props.savingGoal}
                onPress={async () => {
                  if (await props.onSaveGoal(goal)) setEditingGoal(false);
                }}
              >
                {props.savingGoal ? (
                  <ActivityIndicator color={c.bg} />
                ) : (
                  <Text style={s.primaryText}>Save goal</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          {progress && <Text style={s.resetNote}>Resets at {resetTime} your time · 00:00 UTC</Text>}
        </View>

        <View style={s.card}>
          <View style={s.headingRow}>
            <Text style={s.title}>Last 7 days</Text>
            <Text style={s.subtle}>
              {progress ? `${activeDays} active ${activeDays === 1 ? "day" : "days"}` : "—"}
            </Text>
          </View>
          {progress ? (
            <>
              <View style={s.week}>
                {progress.week.map((day) => (
                  <View
                    key={day.date}
                    style={s.day}
                    accessible
                    accessibilityLabel={`${day.label} ${day.day}${day.today ? ", today" : ""}: ${day.count} activities`}
                  >
                    <Text style={s.dayLabel}>{day.label}</Text>
                    <View
                      style={[s.dayCircle, day.count > 0 && s.dayActive, day.today && s.dayToday]}
                    >
                      {day.count > 0 ? (
                        <Ionicons name="checkmark" size={19} color={c.teal} />
                      ) : (
                        <Text style={s.dayNumber}>{day.day}</Text>
                      )}
                    </View>
                    <View style={[s.todayDot, !day.today && { opacity: 0 }]} />
                  </View>
                ))}
              </View>
              <Text style={s.caption}>
                {activeDays === 0
                  ? "Your next practice starts a new habit. You’ve got this."
                  : "Small steps, steady progress. Let’s keep it going."}
              </Text>
            </>
          ) : (
            <Text style={s.caption}>
              {props.progressLoading
                ? "Loading your activity…"
                : "Your study days will appear here when progress loads."}
            </Text>
          )}
        </View>

        <View style={s.quickRow}>
          <TouchableOpacity
            style={[s.quickCard, { borderColor: "#3B4660" }]}
            accessibilityRole="button"
            accessibilityLabel="Open achievements"
            onPress={() => onAction("achievements")}
          >
            <Ionicons name="trophy" size={23} color={c.gold} />
            <Text style={s.quickTitle}>Achievements</Text>
            <Text style={s.detail}>Celebrate your milestones</Text>
            <Ionicons style={s.quickArrow} name="arrow-forward" size={17} color={c.gold} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.quickCard}
            accessibilityRole="button"
            accessibilityLabel="Open my practice lists"
            onPress={() => onAction("practice")}
          >
            <Ionicons name="albums" size={23} color={c.lavender} />
            <Text style={s.quickTitle}>My practice</Text>
            <Text style={s.detail}>Revisit your saved words</Text>
            <Ionicons style={s.quickArrow} name="arrow-forward" size={17} color={c.lavender} />
          </TouchableOpacity>
        </View>

        <Text style={s.sectionLabel}>YOUR STUDY SPACE</Text>
        <View style={s.menuCard}>
          <ActionRow
            icon="stats-chart-outline"
            color={c.blue}
            title="Exam history"
            detail="Results, scores and past attempts"
            onPress={() => onAction("history")}
          />
          <ActionRow
            icon="download-outline"
            color={c.teal}
            title="Offline study packs"
            detail="Manage downloaded exam material"
            onPress={() => onAction("downloads")}
            last
          />
        </View>
        <Text style={s.sectionLabel}>ACCOUNT & SECURITY</Text>
        <View style={s.menuCard}>
          <ActionRow
            icon="person-outline"
            color={c.lavender}
            title="Edit profile"
            detail="Your name and learning level"
            onPress={() => onAction("edit")}
          />
          <ActionRow
            icon="image-outline"
            color={c.pink}
            title="Profile photo"
            detail="Choose a photo · up to 2 MB"
            disabled={props.uploadingAvatar}
            onPress={() => onAction("avatar")}
          />
          <ActionRow
            icon="lock-closed-outline"
            color={c.blue}
            title="Change password"
            detail="Manage your account password"
            onPress={() => onAction("password")}
            last
          />
        </View>
        <Text style={s.sectionLabel}>HELP & INFORMATION</Text>
        <View style={s.menuCard}>
          <ActionRow
            icon="chatbubble-ellipses-outline"
            color={c.teal}
            title="Help & feedback"
            detail="Get in touch with our support team"
            onPress={() => onAction("support")}
          />
          <ActionRow
            icon="shield-checkmark-outline"
            color={c.blue}
            title="Privacy policy"
            detail="How your information is handled"
            onPress={() => onAction("privacy")}
          />
          <ActionRow
            icon="document-text-outline"
            color={c.lavender}
            title="Terms of use"
            detail="Guidelines for using JapanGoLearn"
            onPress={() => onAction("terms")}
          />
          <ActionRow
            icon="information-circle-outline"
            color={c.gold}
            title="About JapanGoLearn"
            detail={`Version ${props.version}`}
            onPress={() => onAction("about")}
            last
          />
        </View>

        <TouchableOpacity
          style={s.signOut}
          onPress={() => onAction("sign-out")}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Ionicons name="log-out-outline" color={c.muted} size={21} />
          <Text style={s.actionTitle}>Sign out</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.deleteButton}
          onPress={() => onAction("delete")}
          disabled={props.deletingAccount}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          accessibilityHint="Opens confirmation before permanently deleting your account"
        >
          {props.deletingAccount ? (
            <ActivityIndicator color={c.danger} />
          ) : (
            <Text style={s.deleteText}>Delete account</Text>
          )}
        </TouchableOpacity>
        {props.memberSince ? (
          <Text style={s.footer}>Learning with us since {props.memberSince}</Text>
        ) : null}
        <Text style={s.footer}>一歩ずつ · One step at a time</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  page: { backgroundColor: c.bg },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  eyebrow: { fontSize: 10, letterSpacing: 2, color: c.muted, fontWeight: "700", marginBottom: 18 },
  identity: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 22 },
  grow: { flex: 1, minWidth: 0 },
  avatarButton: { width: 68, height: 68 },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#65728F",
    backgroundColor: "#34425F",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initial: { fontSize: 30, color: c.lavender, fontWeight: "700" },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#152237BB",
    justifyContent: "center",
  },
  camera: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 24,
    height: 24,
    borderRadius: 10,
    backgroundColor: c.lavender,
    borderWidth: 3,
    borderColor: "#1F304A",
    justifyContent: "center",
    alignItems: "center",
  },
  name: { fontSize: 22, lineHeight: 28, fontWeight: "700", color: c.text },
  email: { color: c.muted, fontSize: 12, marginTop: 3 },
  chips: { flexDirection: "row", gap: 6, marginTop: 9, flexWrap: "wrap" },
  chip: {
    color: c.teal,
    backgroundColor: "#8CDECF16",
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  levelChip: {
    color: c.lavender,
    backgroundColor: "#C4B8F016",
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C4B8F00D",
    borderWidth: 1,
    borderColor: "#C4B8F030",
  },
  levelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 9,
  },
  small: { fontSize: 11, color: c.muted },
  track: { height: 6, borderRadius: 6, backgroundColor: "#31415A", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6 },
  content: { padding: 16, gap: 14 },
  stats: {
    flexDirection: "row",
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 20,
    paddingVertical: 15,
  },
  stat: { flex: 1, alignItems: "center", gap: 5 },
  statValue: { fontSize: 21, fontWeight: "700" },
  statLabel: { fontSize: 11, color: c.muted },
  card: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 20,
    padding: 16,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 15, fontWeight: "700", color: c.text },
  subtle: { fontSize: 11, color: c.teal },
  textButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "flex-end",
    justifyContent: "center",
    marginVertical: -10,
  },
  textLink: { color: c.teal, fontSize: 12, fontWeight: "600" },
  goalNumbers: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  goalValue: { fontSize: 26, fontWeight: "700", color: c.text },
  goalTarget: { fontSize: 14, fontWeight: "400", color: c.muted },
  goalStatus: {
    fontSize: 10,
    color: c.teal,
    backgroundColor: "#8CDECF12",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  caption: { fontSize: 11, color: c.muted, marginTop: 12, lineHeight: 17 },
  resetNote: { fontSize: 10, color: c.muted, marginTop: 10 },
  goalEditor: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: c.border,
    gap: 12,
  },
  goalOptions: { flexDirection: "row", gap: 8 },
  goalOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  goalSelected: { backgroundColor: "#8CDECF14", borderColor: c.teal },
  optionValue: { fontSize: 16, fontWeight: "700", color: c.text },
  primary: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: c.teal,
  },
  primaryText: { color: c.bg, fontSize: 13, fontWeight: "700" },
  week: { flexDirection: "row", justifyContent: "space-between" },
  day: { flex: 1, alignItems: "center", gap: 8 },
  dayLabel: { fontSize: 10, color: c.muted },
  dayCircle: {
    width: 30,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayActive: { backgroundColor: "#8CDECF18" },
  dayToday: { borderColor: c.lavender },
  dayNumber: { fontSize: 11, color: c.muted },
  todayDot: { height: 3, width: 3, borderRadius: 2, backgroundColor: c.lavender },
  quickRow: { flexDirection: "row", gap: 12 },
  quickCard: {
    flex: 1,
    borderRadius: 18,
    padding: 15,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    gap: 8,
  },
  quickTitle: { fontSize: 13, fontWeight: "700", color: c.text },
  quickArrow: { marginTop: 3, alignSelf: "flex-end" },
  sectionLabel: {
    color: c.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginTop: 9,
    marginLeft: 3,
  },
  menuCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.card,
    paddingHorizontal: 14,
  },
  action: {
    minHeight: 74,
    paddingVertical: 13,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  divider: { borderBottomWidth: 1, borderBottomColor: c.border },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: { color: c.text, fontSize: 13, fontWeight: "600" },
  detail: { color: c.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  signOut: {
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  deleteButton: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  deleteText: { color: c.danger, fontSize: 12 },
  footer: { color: c.muted, fontSize: 10, textAlign: "center", lineHeight: 16 },
  notice: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#EAC88F0C",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  noticeText: { flex: 1, color: c.gold, fontSize: 12, lineHeight: 18 },
  loader: { padding: 16 },
});
