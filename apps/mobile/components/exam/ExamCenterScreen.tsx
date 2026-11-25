import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { loadExamAttempts } from "@/lib/exam-attempts";
import { N5_MOCKS } from "@/lib/exam-content";
import type { ExamAttemptRecord } from "@/lib/exam-engine";
import { buildReadinessReport } from "@/lib/exam-readiness";

export default function ExamCenterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<ExamAttemptRecord[]>([]);
  const [selectedExamId, setSelectedExamId] = useState(N5_MOCKS[0].id);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadExamAttempts(user?.id).then((records) => {
        if (active) setAttempts(records);
      });
      return () => {
        active = false;
      };
    }, [user?.id])
  );

  const selectedExam = N5_MOCKS.find((exam) => exam.id === selectedExamId) ?? N5_MOCKS[0];
  const readiness = buildReadinessReport(attempts);
  const trendText = readiness.trendDelta === null ? "—" : `${readiness.trendDelta > 0 ? "+" : ""}${readiness.trendDelta}`;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={Colors.dark.text} />
          </TouchableOpacity>
          <View style={styles.topTitleWrap}>
            <Text style={styles.topEyebrow}>JLPT N5</Text>
            <Text style={styles.topTitle}>Exam Center</Text>
          </View>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/exam/history" as never)}
            accessibilityLabel="Attempt history"
          >
            <Ionicons name="time-outline" size={22} color={Colors.dark.text} />
          </TouchableOpacity>
        </View>

        <LinearGradient colors={["#5B21B6", "#28104F", "#0E7490"]} style={styles.hero}>
          <View style={styles.originalBadge}>
            <Ionicons name="analytics" size={13} color={Colors.gold[300]} />
            <Text style={styles.originalBadgeText}>PERSONALISED READINESS</Text>
          </View>
          <Text style={styles.heroTitle}>
            {readiness.score === null ? "Take your baseline" : `${readiness.score}% ready`}
          </Text>
          <Text style={styles.heroSubtitle}>
            {readiness.label} · {readiness.confidence} confidence
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{readiness.totalAttemptCount}</Text>
              <Text style={styles.statLabel}>attempts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{readiness.coveredMockCount}/{readiness.totalMockCount}</Text>
              <Text style={styles.statLabel}>sets covered</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{trendText}</Text>
              <Text style={styles.statLabel}>trend points</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/exam/readiness" as never)}
          >
            <Text style={styles.primaryButtonText}>View my study plan</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Full mock sets</Text>
            <Text style={styles.sectionSubtitle}>Three original 90-minute N5 practice sets.</Text>
          </View>
        </View>
        {N5_MOCKS.map((exam, index) => {
          const coverage = readiness.coverage.find((item) => item.examId === exam.id);
          return (
            <TouchableOpacity
              key={exam.id}
              style={styles.mockCard}
              activeOpacity={0.78}
              onPress={() => router.push(`/exam/run?mode=full&examId=${exam.id}` as never)}
            >
              <View style={styles.mockNumber}><Text style={styles.mockNumberText}>{index + 1}</Text></View>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionCardTitle}>{exam.title}</Text>
                <Text style={styles.sectionMeta}>
                  {coverage?.latestScore === null ? "Not attempted" : `Latest ${coverage?.latestScore}% · Best ${coverage?.bestScore}%`} · 36 questions
                </Text>
              </View>
              <Ionicons name="play-circle" size={27} color={Colors.primary[300]} />
            </TouchableOpacity>
          );
        })}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Section practice</Text>
            <Text style={styles.sectionSubtitle}>Focus on one skill area with its own timer.</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mockSelector}
        >
          {N5_MOCKS.map((exam, index) => (
            <TouchableOpacity
              key={exam.id}
              style={[styles.mockChip, selectedExam.id === exam.id && styles.mockChipActive]}
              onPress={() => setSelectedExamId(exam.id)}
            >
              <Text
                style={[
                  styles.mockChipText,
                  selectedExam.id === exam.id && styles.mockChipTextActive,
                ]}
              >
                Mock {index + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedExam.sections.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={styles.sectionCard}
            activeOpacity={0.78}
            onPress={() =>
              router.push(
                `/exam/run?mode=section&examId=${selectedExam.id}&section=${section.id}` as never
              )
            }
          >
            <View style={[styles.sectionIcon, { backgroundColor: `${section.color}22` }]}>
              <Ionicons name={`${section.icon}-outline`} size={24} color={section.color} />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionCardTitle}>{section.title}</Text>
              <Text style={styles.sectionJapanese}>{section.japaneseTitle}</Text>
              <Text style={styles.sectionMeta}>
                {section.questions.length} questions · {section.durationSeconds / 60} min
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={Colors.dark.textMuted} />
          </TouchableOpacity>
        ))}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Study anywhere</Text>
            <Text style={styles.sectionSubtitle}>Take the mock offline or print an A4 paper.</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.offlineCard}
          activeOpacity={0.78}
          onPress={() => router.push("/exam/downloads" as never)}
        >
          <LinearGradient
            colors={[`${Colors.primary[700]}44`, `${Colors.accent[700]}28`]}
            style={styles.offlineGradient}
          >
            <View style={styles.offlineIcon}>
              <Ionicons name="cloud-download-outline" size={25} color={Colors.primary[200]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.offlineTitle}>Offline packs & printable PDFs</Text>
              <Text style={styles.offlineMeta}>
                Mock 1 audio, test paper and answer key · about 1.5 MB
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={21} color={Colors.dark.textMuted} />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Official JLPT resources</Text>
            <Text style={styles.sectionSubtitle}>N5 practice workbooks on the official website.</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.officialCard}
          activeOpacity={0.78}
          onPress={() => router.push("/exam/official-resources" as never)}
          accessibilityRole="button"
          accessibilityLabel="Open official JLPT N5 PDF resource library"
        >
          <View style={styles.officialIcon}>
            <Ionicons name="document-text-outline" size={25} color={Colors.accent[300]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.offlineTitle}>Official N5 practice PDFs</Text>
            <Text style={styles.offlineMeta}>2018 and 2012 workbooks · opens jlpt.jp</Text>
          </View>
          <Ionicons name="chevron-forward" size={21} color={Colors.dark.textMuted} />
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent attempts</Text>
          <TouchableOpacity onPress={() => router.push("/exam/history" as never)}>
            <Text style={styles.linkText}>View all</Text>
          </TouchableOpacity>
        </View>

        {attempts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="analytics-outline" size={28} color={Colors.primary[400]} />
            <Text style={styles.emptyTitle}>Your first result will appear here</Text>
            <Text style={styles.emptyText}>
              Guest attempts stay on this device. Sign in to sync history.
            </Text>
          </View>
        ) : (
          attempts.slice(0, 3).map((attempt) => (
            <TouchableOpacity
              key={attempt.id}
              style={styles.attemptRow}
              onPress={() => router.push(`/exam/result?attemptId=${attempt.id}` as never)}
            >
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreText}>{attempt.rawScorePercent}%</Text>
              </View>
              <View style={styles.attemptCopy}>
                <Text style={styles.attemptTitle}>
                  {attempt.mode === "full" ? attempt.examTitle : `${attempt.examTitle} · ${attempt.sectionResults[0]?.title}`}
                </Text>
                <Text style={styles.attemptMeta}>
                  {new Date(attempt.completedAt).toLocaleDateString()} · {attempt.correctAnswers}/
                  {attempt.totalQuestions}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.dark.textMuted} />
            </TouchableOpacity>
          ))
        )}

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.accent[300]} />
          <Text style={styles.noticeText}>
            Results are raw JapanGoLearn practice scores, not official JLPT scaled scores. This mock
            contains no copied JLPT questions.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.bg },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 48, gap: Spacing.md },
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
  topTitleWrap: { alignItems: "center" },
  topEyebrow: {
    color: Colors.primary[300],
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.4,
  },
  topTitle: { color: Colors.dark.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  hero: {
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
    gap: Spacing.md,
    overflow: "hidden",
  },
  originalBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: "rgba(0,0,0,0.24)",
  },
  originalBadgeText: {
    color: Colors.gold[300],
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: "#fff",
    fontSize: FontSize["3xl"],
    lineHeight: 36,
    fontWeight: FontWeight.black,
  },
  heroSubtitle: { color: "rgba(255,255,255,0.76)", fontSize: FontSize.sm, lineHeight: 20 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { color: "#fff", fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  statLabel: { color: "rgba(255,255,255,0.62)", fontSize: FontSize.xs, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.16)" },
  primaryButton: {
    minHeight: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary[500],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  primaryButtonText: { color: "#fff", fontSize: FontSize.base, fontWeight: FontWeight.bold },
  mockCard: {
    minHeight: 78,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  mockNumber: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${Colors.primary[500]}22`,
  },
  mockNumberText: {
    color: Colors.primary[300],
    fontSize: FontSize.lg,
    fontWeight: FontWeight.black,
  },
  mockSelector: { gap: Spacing.sm, paddingVertical: 2 },
  mockChip: {
    minWidth: 82,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
    alignItems: "center",
  },
  mockChipActive: {
    borderColor: Colors.primary[400],
    backgroundColor: `${Colors.primary[500]}22`,
  },
  mockChipText: { color: Colors.dark.textMuted, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  mockChipTextActive: { color: Colors.primary[200] },
  sectionHeader: {
    marginTop: Spacing.sm,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  sectionTitle: { color: Colors.dark.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  sectionSubtitle: { color: Colors.dark.textSecondary, fontSize: FontSize.xs, marginTop: 3 },
  linkText: { color: Colors.primary[300], fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  sectionCard: {
    minHeight: 92,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  sectionIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  offlineCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: `${Colors.primary[500]}44`,
    overflow: "hidden",
  },
  offlineGradient: {
    minHeight: 88,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  offlineIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${Colors.primary[500]}22`,
  },
  offlineTitle: {
    color: Colors.dark.text,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  offlineMeta: { color: Colors.dark.textMuted, fontSize: FontSize.xs, marginTop: 4 },
  officialCard: {
    minHeight: 88,
    padding: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: `${Colors.accent[500]}45`,
  },
  officialIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${Colors.accent[700]}30`,
  },
  sectionCopy: { flex: 1 },
  sectionCardTitle: {
    color: Colors.dark.text,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  sectionJapanese: { color: Colors.dark.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  sectionMeta: { color: Colors.dark.textMuted, fontSize: FontSize.xs, marginTop: 5 },
  emptyCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.dark.text,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.base,
    textAlign: "center",
  },
  emptyText: {
    color: Colors.dark.textMuted,
    fontSize: FontSize.xs,
    lineHeight: 18,
    textAlign: "center",
  },
  attemptRow: {
    minHeight: 76,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.dark.card,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  scoreCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${Colors.primary[500]}22`,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: { color: Colors.primary[300], fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  attemptCopy: { flex: 1 },
  attemptTitle: { color: Colors.dark.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  attemptMeta: { color: Colors.dark.textMuted, fontSize: FontSize.xs, marginTop: 4 },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: `${Colors.accent[700]}20`,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  noticeText: { flex: 1, color: Colors.dark.textSecondary, fontSize: FontSize.xs, lineHeight: 18 },
});
