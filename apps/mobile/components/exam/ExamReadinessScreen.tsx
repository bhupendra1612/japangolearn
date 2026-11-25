import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { loadExamAttempts } from "@/lib/exam-attempts";
import type { ExamAttemptRecord } from "@/lib/exam-engine";
import { buildReadinessReport } from "@/lib/exam-readiness";

const recommendationIcons = {
  analytics: "analytics-outline",
  book: "book-outline",
  headset: "headset-outline",
  refresh: "refresh-outline",
  rocket: "rocket-outline",
} as const;

function scoreColor(score: number | null): string {
  if (score === null) return Colors.dark.textMuted;
  if (score >= 80) return "#34D399";
  if (score >= 60) return Colors.gold[300];
  return "#F87171";
}

export default function ExamReadinessScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<ExamAttemptRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void loadExamAttempts(user?.id).then((records) => {
        if (!active) return;
        setAttempts(records);
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [user?.id])
  );

  const report = buildReadinessReport(attempts);
  const trendLabel =
    report.trendDelta === null
      ? "More full mocks needed"
      : report.trendDelta > 0
        ? `Up ${report.trendDelta} points`
        : report.trendDelta < 0
          ? `Down ${Math.abs(report.trendDelta)} points`
          : "Stable";

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary[300]} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark.text} />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={styles.eyebrow}>JLPT N5</Text>
            <Text style={styles.title}>Readiness plan</Text>
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/exam/history" as never)}
          >
            <Ionicons name="time-outline" size={22} color={Colors.dark.text} />
          </TouchableOpacity>
        </View>

        <LinearGradient colors={["#5B21B6", "#312E81", "#0E7490"]} style={styles.hero}>
          <View style={[styles.scoreRing, { borderColor: scoreColor(report.score) }]}>
            <Text style={styles.scoreValue}>{report.score ?? "—"}</Text>
            <Text style={styles.scoreUnit}>{report.score === null ? "NO DATA" : "% READY"}</Text>
          </View>
          <Text style={styles.heroTitle}>{report.label}</Text>
          <Text style={styles.heroSubtitle}>
            Based on {report.totalAttemptCount} attempt{report.totalAttemptCount === 1 ? "" : "s"}
            {report.fullAttemptCount > 0 ? `, including ${report.fullAttemptCount} full mock${report.fullAttemptCount === 1 ? "" : "s"}` : ""}.
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{report.confidence}</Text>
              <Text style={styles.heroStatLabel}>confidence</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{trendLabel}</Text>
              <Text style={styles.heroStatLabel}>recent trend</Text>
            </View>
          </View>
          <View style={styles.confidenceTrack}>
            <View style={[styles.confidenceFill, { width: `${report.confidencePercent}%` }]} />
          </View>
        </LinearGradient>

        <View>
          <Text style={styles.sectionTitle}>Recommended next steps</Text>
          <Text style={styles.sectionSubtitle}>Updated automatically from your latest answers.</Text>
        </View>
        {report.recommendations.map((recommendation, index) => (
          <TouchableOpacity
            key={recommendation.id}
            style={styles.recommendationCard}
            activeOpacity={0.78}
            onPress={() => router.push(recommendation.href as never)}
          >
            <View style={styles.recommendationIcon}>
              <Ionicons
                name={recommendationIcons[recommendation.icon]}
                size={23}
                color={Colors.primary[200]}
              />
            </View>
            <View style={styles.recommendationCopy}>
              <Text style={styles.recommendationOrder}>STEP {index + 1}</Text>
              <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
              <Text style={styles.recommendationText}>{recommendation.description}</Text>
              <Text style={styles.recommendationAction}>{recommendation.actionLabel} →</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Section readiness</Text>
        <View style={styles.panel}>
          {report.sections.map((section) => (
            <View key={section.sectionId} style={styles.metricBlock}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricTitle}>{section.title}</Text>
                <Text style={[styles.metricScore, { color: scoreColor(section.score) }]}>
                  {section.score === null ? "Not measured" : `${section.score}%`}
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${section.score ?? 0}%`,
                      backgroundColor: scoreColor(section.score),
                    },
                  ]}
                />
              </View>
              <Text style={styles.metricMeta}>
                {section.totalQuestions === 0
                  ? "Complete this section to measure it"
                  : `${section.correctAnswers}/${section.totalQuestions} correct across ${section.attemptCount} attempt${section.attemptCount === 1 ? "" : "s"}`}
              </Text>
            </View>
          ))}
        </View>

        {report.skills.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Skills to focus on</Text>
            <View style={styles.skillGrid}>
              {report.skills.slice(0, 6).map((skill) => (
                <View key={`${skill.sectionId}-${skill.skill}`} style={styles.skillChip}>
                  <Text style={styles.skillName}>{skill.skill}</Text>
                  <Text style={[styles.skillScore, { color: scoreColor(skill.score) }]}>
                    {skill.score}% · {skill.totalQuestions} Q
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Mock coverage</Text>
        <View style={styles.coverageList}>
          {report.coverage.map((mock, index) => (
            <TouchableOpacity
              key={mock.examId}
              style={styles.coverageRow}
              onPress={() => router.push(`/exam/run?mode=full&examId=${mock.examId}` as never)}
            >
              <View style={[styles.coverageNumber, mock.attempted && styles.coverageNumberDone]}>
                {mock.attempted ? (
                  <Ionicons name="checkmark" size={18} color="#fff" />
                ) : (
                  <Text style={styles.coverageNumberText}>{index + 1}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.coverageTitle}>{mock.title}</Text>
                <Text style={styles.coverageMeta}>
                  {mock.attempted
                    ? `${mock.attemptCount} attempt${mock.attemptCount === 1 ? "" : "s"} · Best ${mock.bestScore}%`
                    : "Not attempted yet"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.dark.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.gold[300]} />
          <Text style={styles.noticeText}>
            Readiness is a JapanGoLearn practice estimate using raw accuracy, recency and mock
            coverage. It is not an official JLPT score or pass prediction.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.bg },
  loading: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 48, gap: Spacing.lg },
  topBar: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.card,
  },
  titleWrap: { alignItems: "center" },
  eyebrow: {
    color: Colors.primary[300],
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.4,
  },
  title: { color: Colors.dark.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  hero: {
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  scoreRing: {
    width: 138,
    height: 138,
    borderRadius: 69,
    borderWidth: 9,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValue: { color: "#fff", fontSize: 42, fontWeight: FontWeight.black },
  scoreUnit: { color: "rgba(255,255,255,0.65)", fontSize: 9, fontWeight: FontWeight.bold },
  heroTitle: { color: "#fff", fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  heroSubtitle: {
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  heroStats: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  heroStat: { flex: 1, alignItems: "center", gap: 3 },
  heroStatValue: { color: "#fff", fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  heroStatLabel: { color: "rgba(255,255,255,0.58)", fontSize: 10 },
  statDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.16)" },
  confidenceTrack: {
    width: "100%",
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(0,0,0,0.24)",
    overflow: "hidden",
  },
  confidenceFill: { height: 5, borderRadius: 3, backgroundColor: Colors.primary[200] },
  sectionTitle: { color: Colors.dark.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  sectionSubtitle: { color: Colors.dark.textMuted, fontSize: FontSize.xs, marginTop: 3 },
  recommendationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: `${Colors.primary[500]}42`,
    backgroundColor: Colors.dark.card,
  },
  recommendationIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${Colors.primary[500]}22`,
  },
  recommendationCopy: { flex: 1, gap: 5 },
  recommendationOrder: {
    color: Colors.primary[300],
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  recommendationTitle: { color: Colors.dark.text, fontSize: FontSize.base, fontWeight: FontWeight.bold },
  recommendationText: { color: Colors.dark.textSecondary, fontSize: FontSize.xs, lineHeight: 18 },
  recommendationAction: { color: Colors.primary[300], fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  panel: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
    gap: Spacing.lg,
  },
  metricBlock: { gap: Spacing.sm },
  metricHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metricTitle: { color: Colors.dark.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  metricScore: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  track: { height: 7, borderRadius: 4, backgroundColor: Colors.dark.border, overflow: "hidden" },
  fill: { height: 7, borderRadius: 4 },
  metricMeta: { color: Colors.dark.textMuted, fontSize: 10 },
  skillGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  skillChip: {
    minWidth: "47%",
    flexGrow: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 5,
  },
  skillName: { color: Colors.dark.text, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  skillScore: { fontSize: 10, fontWeight: FontWeight.bold },
  coverageList: { gap: Spacing.sm },
  coverageRow: {
    minHeight: 72,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.dark.card,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  coverageNumber: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.surface,
  },
  coverageNumberDone: { backgroundColor: "#059669" },
  coverageNumberText: { color: Colors.dark.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  coverageTitle: { color: Colors.dark.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  coverageMeta: { color: Colors.dark.textMuted, fontSize: FontSize.xs, marginTop: 4 },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: `${Colors.gold[500]}14`,
  },
  noticeText: { flex: 1, color: Colors.dark.textSecondary, fontSize: FontSize.xs, lineHeight: 18 },
});
