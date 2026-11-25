import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Tabs, useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { getXpLevelProgress } from "@japangolearn/content";
import { useAuth } from "@/lib/auth";
import { AuthPromptModal } from "./AuthPromptModal";
import { useHomeDashboard, useStudyMinutes } from "@/lib/use-home-dashboard";
import {
  activityAge,
  activityStudyArea,
  continueStudyArea,
  dailyKanji,
  goalProgress,
  STUDY_MINUTES,
  studyAreaLabels,
  studyPlan,
  type StudyArea,
} from "@/lib/home-study";
import { kanjiPronunciation } from "@/lib/kanji-study";
import { describeAge } from "@/lib/offline-cache";
import { createVocabularySpeechPlayer, type VocabularyPlayback } from "@/lib/vocabulary-speech";

type Icon = React.ComponentProps<typeof Ionicons>["name"];
type Destination = StudyArea | "practice" | "exam" | "profile";
const c = {
  bg: "#101222",
  card: "#1B1E32",
  border: "#30354E",
  text: "#F6F4FF",
  muted: "#ADB4CF",
  purple: "#C4AEFF",
  mint: "#74E0BC",
  blue: "#8BBEFF",
  amber: "#FFD083",
  pink: "#FFA5CD",
  orange: "#FFB28A",
};
const areas: Record<Destination, { label: string; detail: string; icon: Icon; color: string }> = {
  vocabulary: { label: "Vocabulary", detail: "Listen & remember", icon: "book", color: c.purple },
  kanji: { label: "Kanji", detail: "Read & discover", icon: "leaf", color: c.pink },
  grammar: { label: "Grammar", detail: "Build a sentence", icon: "chatbubbles", color: c.blue },
  writing: { label: "Kana", detail: "Read, write & quiz", icon: "brush", color: c.mint },
  practice: { label: "My practice", detail: "Your saved lists", icon: "layers", color: c.amber },
  exam: { label: "Exam center", detail: "N5 mock tests", icon: "school", color: c.orange },
  profile: {
    label: "My progress",
    detail: "Goals & achievements",
    icon: "stats-chart",
    color: c.mint,
  },
};
const shortcuts: Destination[] = ["vocabulary", "kanji", "grammar", "writing", "practice", "exam"];
const routes = {
  vocabulary: "/(tabs)/vocabulary",
  kanji: "/(tabs)/kanji",
  grammar: "/(tabs)/grammar",
  writing: "/(tabs)/writing",
  practice: "/(tabs)/practice",
  profile: "/(tabs)/profile",
  exam: "/exam",
} as const;

function IconTile({ name, color, size = 42 }: { name: Icon; color: string; size?: number }) {
  return (
    <View
      style={[
        s.iconTile,
        { width: size, height: size, borderRadius: size * 0.3, backgroundColor: color + "18" },
      ]}
    >
      <Ionicons name={name} size={size * 0.49} color={color} />
    </View>
  );
}
function SmallButton({
  name,
  label,
  color = c.purple,
  onPress,
}: {
  name: Icon;
  label: string;
  color?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={s.smallButton}
    >
      <Ionicons name={name} size={21} color={color} />
    </TouchableOpacity>
  );
}
function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      {hint && <Text style={s.small}>{hint}</Text>}
    </View>
  );
}

export default function HomeDashboard() {
  const { user } = useAuth();
  return <HomeContent key={user?.id ?? "guest"} />;
}

function HomeContent() {
  const insets = useSafeAreaInsets();
  const compact = useWindowDimensions().width < 360;
  const router = useRouter();
  const { user, profile, session } = useAuth();
  const { snapshot, savedAt, failed, refreshing, now, kanji, refresh } = useHomeDashboard(user?.id);
  const { minutes, ready, chooseMinutes } = useStudyMinutes(user?.id ?? "guest");
  const [prompt, setPrompt] = useState<"practice" | "profile" | null>(null);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [playback, setPlayback] = useState<VocabularyPlayback>({
    wordId: null,
    mode: null,
    error: false,
  });
  const [player] = useState(() => createVocabularySpeechPlayer(Speech, setPlayback));
  useFocusEffect(
    useCallback(
      () => () => {
        player.stop();
        setPrompt(null);
      },
      [player]
    )
  );

  const go = (destination: Destination) => {
    player.stop();
    if ((destination === "practice" || destination === "profile") && !session) {
      setPrompt(destination);
      return;
    }
    if (destination === "exam") router.push(routes.exam);
    else router.navigate(routes[destination]);
  };
  const name =
    profile?.display_name?.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || "Learner";
  const hour = now.getHours();
  const greeting =
    hour >= 6 && hour < 12 ? "おはよう" : hour >= 12 && hour < 18 ? "こんにちは" : "こんばんは";
  const activities = snapshot?.activities ?? [];
  const resume = continueStudyArea(activities);
  const nextArea = resume ?? "writing";
  const xp = snapshot?.xp ?? profile?.xp ?? 0;
  const streak = snapshot?.streak ?? profile?.streak_days ?? 0;
  const level = getXpLevelProgress(xp);
  const today = now.toISOString().slice(0, 10);
  const todayKnown = snapshot?.day === today;
  const goal = goalProgress(
    todayKnown ? snapshot.dailyXp : 0,
    snapshot?.dailyTarget ?? profile?.daily_xp_goal ?? 100
  );
  const reset = new Date(now);
  reset.setUTCHours(24, 0, 0, 0);
  const resetTime = reset.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const character = dailyKanji(kanji.data, now);
  const plan = studyPlan(minutes);
  const openDailyKanji = () => {
    player.stop();
    if (character)
      router.navigate({
        pathname: "/(tabs)/kanji",
        params: { focusItemId: String(character.id), focusNonce: String(Date.now()) },
      });
    else go("kanji");
  };

  return (
    <>
      <Tabs.Screen
        options={{
          headerStyle: { backgroundColor: c.bg },
          headerTitle: () => (
            <View style={[s.row, { gap: 7 }]}>
              <Ionicons name="flower" size={21} color={c.pink} />
              <Text style={s.brand}>
                JapanGo<Text style={{ color: c.purple }}>Learn</Text>
              </Text>
            </View>
          ),
          headerRight: () => (
            <View style={s.levelBadge}>
              <Text style={s.levelBadgeText}>N5 PATH</Text>
            </View>
          ),
        }}
      />
      <ScrollView
        style={s.screen}
        contentContainerStyle={[s.content, { paddingTop: insets.top + 66 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={c.purple}
            progressViewOffset={insets.top + 56}
          />
        }
      >
        <View style={s.greetingRow}>
          <View style={s.grow}>
            <Text style={s.eyebrow}>{greeting} · LET’S LEARN</Text>
            <Text style={s.name} numberOfLines={1}>
              Hello, {name}
              <Text style={{ color: c.amber }}>.</Text>
            </Text>
            <Text style={s.small}>
              {now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={session ? "Open my profile" : "Sign in to save progress"}
            onPress={() => go("profile")}
            style={s.avatar}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatarImage} />
            ) : (
              <Ionicons name={session ? "person" : "happy"} size={28} color={c.purple} />
            )}
            <View style={s.avatarDot}>
              <Ionicons name="sparkles" size={10} color={c.bg} />
            </View>
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={["#3C3067", "#292848", "#203448"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={[s.row, { alignItems: "flex-start" }]}>
            <View style={s.grow}>
              <View style={[s.row, { gap: 6 }]}>
                <Ionicons name="compass" size={15} color={c.amber} />
                <Text style={[s.eyebrow, { color: c.amber }]}>YOUR NEXT STEP</Text>
              </View>
              <Text style={[s.heroTitle, compact && { fontSize: 21, lineHeight: 27 }]}>
                {resume ? "Welcome back.\nLet’s keep going." : "Small steps.\nReal Japanese."}
              </Text>
              <Text style={s.heroDescription}>
                {resume
                  ? `Return to ${studyAreaLabels[resume].toLowerCase()}, your recent focus.`
                  : "Start with the sounds. Build from there."}
              </Text>
            </View>
            <View
              style={[s.art, compact && { width: 60, marginLeft: 0 }]}
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              aria-hidden
              pointerEvents="none"
            >
              <View style={s.artBack}>
                <Text style={s.artBackText}>あ</Text>
              </View>
              <View style={s.artFront}>
                <Ionicons name="sparkles" color={c.amber} size={14} />
                <Text style={s.artCharacter}>学</Text>
                <Text style={s.artCaption}>LEARN</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={resume ? `Continue ${studyAreaLabels[resume]}` : "Start with kana"}
            onPress={() => go(nextArea)}
            activeOpacity={0.8}
            style={s.heroButton}
          >
            <Ionicons name="play" size={16} color={c.bg} />
            <Text style={s.heroButtonText}>
              {resume ? `Continue ${studyAreaLabels[resume].toLowerCase()}` : "Start with kana"}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={c.bg} />
          </TouchableOpacity>
        </LinearGradient>

        {session && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="View my learning progress"
            onPress={() => go("profile")}
            style={s.stats}
          >
            <View style={s.stat}>
              <Ionicons name="flame" size={18} color={c.orange} />
              <Text style={s.statValue}>{streak}</Text>
              <Text style={s.statLabel}>day streak</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Ionicons name="star" size={17} color={c.amber} />
              <Text style={s.statValue}>{xp.toLocaleString()}</Text>
              <Text style={s.statLabel}>XP</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.stat}>
              <Ionicons name="ribbon" size={18} color={c.mint} />
              <Text style={s.statValue}>{level.level}</Text>
              <Text style={s.statLabel}>level</Text>
            </View>
          </TouchableOpacity>
        )}

        <View>
          <SectionTitle title="Explore & learn" hint="Pick your next skill" />
          <View style={s.shortcutGrid}>
            {shortcuts.map((destination) => {
              const area = areas[destination];
              return (
                <TouchableOpacity
                  key={destination}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${area.label}`}
                  onPress={() => go(destination)}
                  activeOpacity={0.72}
                  style={s.shortcut}
                >
                  <IconTile name={area.icon} color={area.color} size={44} />
                  <Text style={s.shortcutTitle}>{area.label}</Text>
                  <Text style={s.shortcutDetail}>{area.detail}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {failed && (
          <View style={s.notice} accessibilityRole="alert">
            <IconTile name="cloud-offline" color={c.amber} size={34} />
            <View style={s.grow}>
              <Text style={s.noticeTitle}>
                {snapshot ? "Showing your saved progress" : "Progress couldn’t refresh"}
              </Text>
              <Text style={s.small}>
                {snapshot
                  ? `Updated ${describeAge(savedAt)}. Lessons are still available.`
                  : "You can keep exploring. Try refreshing your progress."}
              </Text>
            </View>
            <SmallButton
              name="refresh"
              label="Retry home progress"
              onPress={() => void refresh()}
              color={c.amber}
            />
          </View>
        )}

        {session ? (
          <View style={s.panel}>
            <View style={s.row}>
              <IconTile
                name={todayKnown && goal.ratio >= 1 ? "checkmark-circle" : "flag"}
                color={c.mint}
                size={37}
              />
              <View style={s.grow}>
                <Text style={s.panelTitle}>
                  {todayKnown && goal.ratio >= 1
                    ? "Daily goal complete!"
                    : "A little progress, every day"}
                </Text>
                <Text style={s.small}>
                  {todayKnown
                    ? `${goal.earned} / ${goal.target} XP`
                    : refreshing
                      ? "Refreshing today’s progress…"
                      : "Today’s progress is unavailable"}
                </Text>
              </View>
              <SmallButton
                name="stats-chart"
                label="View goals and progress"
                onPress={() => go("profile")}
                color={c.mint}
              />
            </View>
            <View
              style={s.goalTrack}
              accessibilityRole="progressbar"
              accessibilityLabel="Daily XP goal"
              aria-valuemin={todayKnown ? 0 : undefined}
              aria-valuemax={todayKnown ? goal.target : undefined}
              aria-valuenow={todayKnown ? Math.min(goal.earned, goal.target) : undefined}
              aria-valuetext={
                todayKnown ? `${goal.earned} of ${goal.target} XP` : "Progress unavailable"
              }
              accessibilityValue={
                todayKnown
                  ? {
                      min: 0,
                      max: goal.target,
                      now: Math.min(goal.earned, goal.target),
                      text: `${goal.earned} of ${goal.target} XP`,
                    }
                  : { text: "Progress unavailable" }
              }
            >
              <View
                style={[s.goalFill, { width: `${todayKnown ? Math.round(goal.ratio * 100) : 0}%` }]}
              />
            </View>
            <View style={s.between}>
              <Text style={s.small}>
                {todayKnown
                  ? goal.remaining
                    ? `${goal.remaining} XP to your goal`
                    : "You made time for your Japanese."
                  : "Refresh to see your latest XP."}
              </Text>
              <Text style={s.resetTime}>Resets {resetTime}</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Save my learning progress"
            onPress={() => go("profile")}
            activeOpacity={0.8}
            style={s.guestCard}
          >
            <IconTile name="cloud-done" color={c.mint} />
            <View style={s.grow}>
              <Text style={s.panelTitle}>Make your progress count.</Text>
              <Text style={s.small}>Sign in for daily goals, XP, and practice lists.</Text>
            </View>
            <Ionicons name="arrow-forward" size={19} color={c.mint} />
          </TouchableOpacity>
        )}

        <View style={s.panel}>
          <View style={s.row}>
            <IconTile name="timer" color={c.blue} size={37} />
            <View style={s.grow}>
              <Text style={s.panelTitle}>Make a little time</Text>
              <Text style={s.small}>A simple plan for the time you have.</Text>
            </View>
          </View>
          <View style={s.timeOptions}>
            {STUDY_MINUTES.map((value) => (
              <TouchableOpacity
                key={value}
                accessibilityRole="radio"
                aria-checked={minutes === value}
                accessibilityLabel={`${value} minute study plan`}
                accessibilityState={{ checked: minutes === value, disabled: !ready }}
                disabled={!ready}
                onPress={() => chooseMinutes(value)}
                style={[s.timeOption, minutes === value && s.timeOptionActive]}
              >
                <Ionicons
                  name={value === 5 ? "leaf" : value === 10 ? "flash" : "rocket"}
                  color={minutes === value ? c.blue : c.muted}
                  size={16}
                />
                <Text style={[s.timeLabel, minutes === value && { color: c.text }]}>
                  {value} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View>
            {plan.map((step, index) => (
              <TouchableOpacity
                key={step.area}
                accessibilityRole="button"
                accessibilityLabel={`${step.task}, about ${step.minutes} minutes`}
                onPress={() => go(step.area)}
                style={[s.planStep, index > 0 && s.divider]}
              >
                <Text style={s.stepNumber}>{String(index + 1).padStart(2, "0")}</Text>
                <IconTile name={areas[step.area].icon} color={areas[step.area].color} size={30} />
                <View style={s.grow}>
                  <Text style={s.stepTitle}>{step.task}</Text>
                  <Text style={s.small}>
                    {studyAreaLabels[step.area]} · {step.minutes} min
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.muted} />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.planNote}>Suggested study time · choose any step to begin</Text>
        </View>

        <View>
          <SectionTitle title="One new connection" hint="Today’s kanji" />
          <View style={s.dailyCard}>
            {character ? (
              <>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Explore today's kanji ${character.character}, ${character.meaning_en[0]}`}
                  onPress={openDailyKanji}
                  style={[s.row, { flex: 1, gap: 15 }]}
                >
                  <View style={s.dailyGlyph}>
                    <Text style={s.dailyCharacter}>{character.character}</Text>
                  </View>
                  <View style={s.grow}>
                    <Text style={s.dailyMeaning}>{character.meaning_en.join(" · ")}</Text>
                    <Text style={s.dailyReading}>
                      {character.hiragana || character.kunyomi[0]?.reading}
                    </Text>
                    <Text style={s.small}>{character.stroke_count} strokes · N5</Text>
                    <View style={[s.row, { gap: 5, marginTop: 7 }]}>
                      <Text style={s.dailyLink}>Explore the character</Text>
                      <Ionicons name="arrow-forward" size={12} color={c.pink} />
                    </View>
                  </View>
                </TouchableOpacity>
                <SmallButton
                  name={playback.mode ? "stop" : "volume-high"}
                  label={playback.mode ? "Stop kanji pronunciation" : "Listen to today's kanji"}
                  color={c.pink}
                  onPress={() =>
                    playback.mode
                      ? player.stop()
                      : void player.speak(character.id, kanjiPronunciation(character), "normal")
                  }
                />
              </>
            ) : (
              <>
                <IconTile name="leaf" color={c.pink} />
                <View style={s.grow}>
                  <Text style={s.panelTitle}>
                    {kanji.refreshing ? "Finding today’s kanji…" : "Discover your next character"}
                  </Text>
                  <Text style={s.small}>Readings, stroke order, and words to try.</Text>
                </View>
                {kanji.refreshing ? (
                  <ActivityIndicator color={c.pink} />
                ) : (
                  <SmallButton
                    name="arrow-forward"
                    label="Explore kanji library"
                    onPress={() => go("kanji")}
                    color={c.pink}
                  />
                )}
              </>
            )}
          </View>
          {kanji.error && !!character && (
            <Text style={s.subtleNote}>Daily discovery from your saved library.</Text>
          )}
          {playback.error && (
            <Text accessibilityRole="alert" style={s.subtleNote}>
              Audio is unavailable. Check your device’s Japanese voice.
            </Text>
          )}
        </View>

        {session && (
          <View style={s.panel}>
            <View style={s.between}>
              <Text style={s.sectionTitle}>Your recent steps</Text>
              {activities.length > 3 && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={showAllActivity ? "Show less activity" : "Show more activity"}
                  style={s.textButton}
                  onPress={() => setShowAllActivity((v) => !v)}
                >
                  <Text style={s.textButtonLabel}>
                    {showAllActivity ? "Show less" : "See more"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {!activities.length ? (
              <View style={s.emptyActivity}>
                <IconTile name="footsteps" color={c.purple} size={42} />
                <View style={s.grow}>
                  <Text style={s.panelTitle}>
                    {refreshing
                      ? "Loading your recent activity…"
                      : failed
                        ? "Activity is unavailable for now"
                        : "Your journey starts here"}
                  </Text>
                  <Text style={s.small}>
                    {failed ? "Pull down to try again." : "Completed practice will appear here."}
                  </Text>
                </View>
              </View>
            ) : (
              activities.slice(0, showAllActivity ? 8 : 3).map((activity, index) => {
                const area = activityStudyArea(activity);
                const visual = area ? areas[area] : { icon: "sparkles" as const, color: c.amber };
                const body = (
                  <>
                    <IconTile name={visual.icon} color={visual.color} size={35} />
                    <View style={s.grow}>
                      <Text style={s.activityTitle} numberOfLines={2}>
                        {activity.title}
                      </Text>
                      <Text style={s.small}>{activityAge(activity.created_at, now)}</Text>
                    </View>
                    {activity.xp_earned > 0 && (
                      <Text style={s.activityXp}>+{activity.xp_earned} XP</Text>
                    )}
                    {area && <Ionicons name="chevron-forward" size={14} color={c.muted} />}
                  </>
                );
                return area ? (
                  <TouchableOpacity
                    key={activity.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${activity.title}. Open ${studyAreaLabels[area]}`}
                    onPress={() => go(area)}
                    style={[s.activity, index > 0 && s.divider]}
                  >
                    {body}
                  </TouchableOpacity>
                ) : (
                  <View key={activity.id} style={[s.activity, index > 0 && s.divider]}>
                    {body}
                  </View>
                );
              })
            )}
          </View>
        )}
        <View style={s.footer}>
          <Ionicons name="flower" size={19} color={c.pink} />
          <Text style={s.footerJapanese}>毎日少しずつ</Text>
          <Text style={s.small}>A little every day.</Text>
        </View>
      </ScrollView>
      <AuthPromptModal
        visible={prompt !== null}
        feature={prompt === "practice" ? "custom practice lists" : "learning progress"}
        redirectTo={prompt === "practice" ? routes.practice : routes.profile}
        description="Keep your study history, earn XP through practice, and work toward your daily goal with a free account."
        onClose={() => setPrompt(null)}
      />
    </>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 20,
    width: "100%",
    maxWidth: 780,
    alignSelf: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  grow: { flex: 1, minWidth: 0 },
  brand: { fontSize: 16, color: c.text, fontWeight: "800", letterSpacing: -0.5 },
  levelBadge: {
    marginRight: 20,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: c.purple + "12",
    borderWidth: 1,
    borderColor: c.purple + "25",
  },
  levelBadgeText: { color: c.purple, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  greetingRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  eyebrow: { fontSize: 9, color: c.purple, fontWeight: "800", letterSpacing: 1.5 },
  name: {
    fontSize: 27,
    lineHeight: 36,
    color: c.text,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginTop: 4,
  },
  small: { fontSize: 11, lineHeight: 17, color: c.muted },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: "#29243F",
    borderWidth: 1,
    borderColor: "#48405E",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: 46, height: 46, borderRadius: 16 },
  avatarDot: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 17,
    height: 17,
    borderRadius: 8,
    backgroundColor: c.mint,
    borderWidth: 2,
    borderColor: c.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    borderRadius: 24,
    padding: 20,
    gap: 17,
    borderWidth: 1,
    borderColor: "#51496E",
    overflow: "hidden",
  },
  heroTitle: {
    fontSize: 25,
    lineHeight: 30,
    color: c.text,
    fontWeight: "800",
    letterSpacing: -0.7,
    marginTop: 12,
  },
  heroDescription: { fontSize: 11, lineHeight: 18, color: "#CFD0E5", marginTop: 8 },
  heroButton: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: c.purple,
    maxWidth: "100%",
  },
  heroButtonText: { fontSize: 12, fontWeight: "800", color: c.bg, flexShrink: 1 },
  art: { width: 77, height: 100, marginLeft: 5, marginTop: 14 },
  artBack: {
    position: "absolute",
    width: 60,
    height: 80,
    left: -5,
    top: 1,
    borderRadius: 15,
    backgroundColor: "#517075",
    borderWidth: 1,
    borderColor: "#74968F",
    transform: [{ rotate: "-15deg" }],
    alignItems: "center",
    justifyContent: "center",
  },
  artBackText: { color: "#B4D7C9", fontSize: 32 },
  artFront: {
    position: "absolute",
    right: -2,
    top: 16,
    width: 62,
    height: 87,
    backgroundColor: "#F4E5CF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#FFF1D9",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "9deg" }],
  },
  artCharacter: { fontSize: 34, lineHeight: 43, color: "#594E72" },
  artCaption: { color: "#6D6080", fontSize: 7, fontWeight: "800", letterSpacing: 1.5 },
  iconTile: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
  smallButton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderColor: c.border,
    marginTop: -9,
  },
  stat: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { color: c.text, fontSize: 14, fontWeight: "800" },
  statLabel: { color: c.muted, fontSize: 10 },
  statDivider: { width: 1, height: 19, backgroundColor: c.border },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 13,
    flexWrap: "wrap",
  },
  sectionTitle: { color: c.text, fontSize: 18, fontWeight: "700", letterSpacing: -0.4 },
  shortcutGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  shortcut: {
    flexGrow: 1,
    flexBasis: "30%",
    alignItems: "center",
    gap: 6,
    paddingVertical: 15,
    paddingHorizontal: 5,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 19,
  },
  shortcutTitle: {
    color: c.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 3,
  },
  shortcutDetail: { color: c.muted, fontSize: 9, lineHeight: 13, textAlign: "center" },
  panel: {
    padding: 17,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 21,
    gap: 13,
  },
  panelTitle: { color: c.text, fontSize: 14, lineHeight: 20, fontWeight: "700" },
  goalTrack: { height: 7, backgroundColor: c.border, borderRadius: 5, overflow: "hidden" },
  goalFill: { height: "100%", backgroundColor: c.mint, borderRadius: 5 },
  resetTime: { color: c.muted, fontSize: 9 },
  guestCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#1A2C30",
    borderWidth: 1,
    borderColor: "#34554E",
    borderRadius: 20,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 12,
    backgroundColor: "#2C2830",
    borderWidth: 1,
    borderColor: "#574A39",
    borderRadius: 17,
  },
  noticeTitle: { color: c.amber, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  timeOptions: {
    flexDirection: "row",
    backgroundColor: c.bg,
    borderRadius: 13,
    padding: 4,
    gap: 4,
  },
  timeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  timeOptionActive: { backgroundColor: "#26334D", borderColor: "#516184" },
  timeLabel: { fontSize: 12, color: c.muted, fontWeight: "700" },
  planStep: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13 },
  divider: { borderTopWidth: 1, borderColor: c.border },
  stepNumber: { color: "#818BA9", fontSize: 10, fontWeight: "700", width: 15 },
  stepTitle: { color: c.text, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  planNote: { color: c.muted, fontSize: 10, textAlign: "center" },
  dailyCard: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    backgroundColor: "#2A2235",
    borderColor: "#50374A",
    borderWidth: 1,
    borderRadius: 21,
    padding: 15,
  },
  dailyGlyph: {
    width: 65,
    height: 85,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#775069",
    backgroundColor: "#38283D",
    alignItems: "center",
    justifyContent: "center",
  },
  dailyCharacter: { fontSize: 45, color: "#FFD9E9" },
  dailyMeaning: { color: c.text, fontSize: 18, lineHeight: 24, fontWeight: "700" },
  dailyReading: { color: c.pink, fontSize: 13, marginVertical: 4 },
  dailyLink: { color: c.pink, fontSize: 10, fontWeight: "700" },
  subtleNote: { color: c.muted, fontSize: 10, lineHeight: 16, paddingHorizontal: 8, marginTop: 7 },
  textButton: { minHeight: 44, justifyContent: "center" },
  textButtonLabel: { fontSize: 11, color: c.purple, fontWeight: "700" },
  emptyActivity: { flexDirection: "row", gap: 12, paddingVertical: 10, alignItems: "center" },
  activity: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13 },
  activityTitle: { color: c.text, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  activityXp: { color: c.amber, fontSize: 10, fontWeight: "700" },
  footer: { alignItems: "center", gap: 7, paddingVertical: 5 },
  footerJapanese: { color: c.text, fontSize: 18, letterSpacing: 2 },
});
