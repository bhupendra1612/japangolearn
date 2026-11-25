import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { ListeningMistakeListModal } from "@/components/exam/ListeningMistakeListModal";
import { useAuth } from "@/lib/auth";
import { getLocalAttempt, loadExamAttempts } from "@/lib/exam-attempts";
import { getExamDefinition, getExamSection, N5_MOCK_1 } from "@/lib/exam-content";
import { getReadinessLabel, type ExamAttemptRecord } from "@/lib/exam-engine";

export default function ExamResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { attemptId } = useLocalSearchParams<{ attemptId?: string }>();
  const [attempt, setAttempt] = useState<ExamAttemptRecord | null>(() =>
    attemptId ? (getLocalAttempt(attemptId, user?.id) ?? null) : null
  );
  const [loading, setLoading] = useState(!attempt);
  const [showMistakeList, setShowMistakeList] = useState(false);

  useEffect(() => {
    if (!attemptId || attempt) return;
    void loadExamAttempts(user?.id).then((records) => {
      setAttempt(records.find((item) => item.id === attemptId) ?? null);
      setLoading(false);
    });
  }, [attempt, attemptId, user?.id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary[300]} />
      </View>
    );
  }
  if (!attempt) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>Result not found</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace("/exam" as never)}
        >
          <Text style={styles.primaryButtonText}>Back to Exam Center</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const exam = getExamDefinition(attempt.examId) ?? N5_MOCK_1;
  const resultSections =
    attempt.mode === "full"
      ? exam.sections
      : [getExamSection(attempt.sectionId ?? undefined, exam.id)].filter((section) => section !== undefined);
  const reviewedQuestions = resultSections.flatMap((section) =>
    section.questions.map((question) => ({ question, selected: attempt.answers[question.id] }))
  );
  const listeningMistakes = reviewedQuestions.flatMap(({ question, selected }) =>
    question.sectionId === "listening" && selected !== question.correctChoice ? [question] : []
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.replace("/exam" as never)}
            accessibilityLabel="Close result"
          >
            <Ionicons name="close" size={23} color={Colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Practice result</Text>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/exam/history" as never)}
            accessibilityLabel="Attempt history"
          >
            <Ionicons name="time-outline" size={22} color={Colors.dark.text} />
          </TouchableOpacity>
        </View>

        <LinearGradient colors={["#4C1D95", "#1A1433"]} style={styles.hero}>
          <Text style={styles.heroEyebrow}>
            {attempt.mode === "full" ? "FULL MOCK COMPLETE" : "SECTION COMPLETE"}
          </Text>
          <View style={styles.scoreRing}>
            <Text style={styles.scoreValue}>{attempt.rawScorePercent}%</Text>
            <Text style={styles.scoreCaption}>RAW SCORE</Text>
          </View>
          <Text style={styles.readiness}>{getReadinessLabel(attempt.rawScorePercent)}</Text>
          <Text style={styles.heroMeta}>
            {attempt.correctAnswers} of {attempt.totalQuestions} correct
          </Text>
          <View style={styles.syncPill}>
            <Ionicons
              name={attempt.syncedAt ? "cloud-done-outline" : "phone-portrait-outline"}
              size={15}
              color={Colors.dark.textSecondary}
            />
            <Text style={styles.syncText}>
              {attempt.syncedAt ? "Saved to your account" : "Saved on this device"}
            </Text>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Section breakdown</Text>
        <View style={styles.breakdownCard}>
          {attempt.sectionResults.map((result) => (
            <View key={result.sectionId} style={styles.breakdownRow}>
              <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownTitle}>{result.title}</Text>
                <Text style={styles.breakdownScore}>
                  {result.correctAnswers}/{result.totalQuestions} · {result.rawScorePercent}%
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${result.rawScorePercent}%` }]} />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.gold[300]} />
          <Text style={styles.disclaimerText}>
            This is a raw practice score. JLPT uses scaled section scores and its official result
            cannot be reproduced from this mock.
          </Text>
        </View>

        {listeningMistakes.length > 0 ? (
          <TouchableOpacity
            style={styles.mistakeButton}
            onPress={() => {
              if (!user) {
                router.push("/(auth)/login" as never);
                return;
              }
              setShowMistakeList(true);
            }}
          >
            <View style={styles.mistakeIcon}>
              <Ionicons name="headset" size={21} color={Colors.sakura[300]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mistakeTitle}>Practise listening mistakes</Text>
              <Text style={styles.mistakeMeta}>
                {user ? "Save them to a practice list" : "Sign in to save and revisit them"}
              </Text>
            </View>
            <Text style={styles.mistakeCount}>{listeningMistakes.length}</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.dark.textMuted} />
          </TouchableOpacity>
        ) : null}

        {reviewedQuestions.length > 0 ? (
          <Text style={styles.sectionTitle}>Answer review</Text>
        ) : null}
        {reviewedQuestions.map(({ question, selected }, index) => {
          if (!question) return null;
          const correct = selected === question.correctChoice;
          return (
            <View key={question.id} style={styles.reviewCard}>
              <View style={styles.reviewTop}>
                <View
                  style={[
                    styles.resultIcon,
                    { backgroundColor: correct ? "rgba(16,185,129,0.16)" : "rgba(239,68,68,0.16)" },
                  ]}
                >
                  <Ionicons
                    name={correct ? "checkmark" : "close"}
                    size={18}
                    color={correct ? "#34D399" : "#F87171"}
                  />
                </View>
                <Text style={styles.reviewNumber}>Question {index + 1}</Text>
                <Text style={[styles.reviewStatus, { color: correct ? "#34D399" : "#F87171" }]}>
                  {correct ? "Correct" : "Review"}
                </Text>
              </View>
              <Text style={styles.reviewPrompt}>{question.prompt}</Text>
              {question.audioScript ? (
                <View style={styles.transcriptCard}>
                  <Text style={styles.transcriptLabel}>TRANSCRIPT</Text>
                  <Text style={styles.transcriptText}>{question.audioScript}</Text>
                </View>
              ) : null}
              <Text style={styles.reviewAnswer}>
                Your answer: {question.choices[selected ?? -1] ?? "Unanswered"}
              </Text>
              {!correct ? (
                <Text style={styles.correctAnswer}>
                  Correct answer: {question.choices[question.correctChoice]}
                </Text>
              ) : null}
              <Text style={styles.explanation}>{question.explanation}</Text>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() =>
            router.push(
              attempt.mode === "full"
                ? (`/exam/run?mode=full&examId=${attempt.examId}` as never)
                : (`/exam/run?mode=section&examId=${attempt.examId}&section=${attempt.sectionId}` as never)
            )
          }
        >
          <Ionicons name="refresh" size={19} color="#fff" />
          <Text style={styles.primaryButtonText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace("/exam" as never)}
        >
          <Text style={styles.secondaryButtonText}>Back to Exam Center</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push("/exam/readiness" as never)}
        >
          <Text style={styles.secondaryButtonText}>View readiness plan</Text>
        </TouchableOpacity>
      </ScrollView>
      <ListeningMistakeListModal
        visible={showMistakeList}
        questions={listeningMistakes}
        onClose={() => setShowMistakeList(false)}
        onSaved={(count, listTitle) => {
          setShowMistakeList(false);
          Alert.alert(
            count > 0 ? "Saved for practice" : "Already saved",
            count > 0
              ? `${count} listening mistake${count === 1 ? "" : "s"} saved to “${listTitle}”.`
              : `These listening mistakes are already in “${listTitle}”.`
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.bg },
  centered: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  notFound: { color: Colors.dark.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
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
    backgroundColor: Colors.dark.card,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { color: Colors.dark.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  hero: {
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
  heroEyebrow: {
    color: Colors.primary[200],
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.4,
  },
  scoreRing: {
    width: 142,
    height: 142,
    borderRadius: 71,
    borderWidth: 9,
    borderColor: Colors.primary[400],
    alignItems: "center",
    justifyContent: "center",
    marginVertical: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  scoreValue: { color: "#fff", fontSize: 38, fontWeight: FontWeight.black },
  scoreCaption: {
    color: Colors.dark.textSecondary,
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  readiness: { color: "#fff", fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  heroMeta: { color: Colors.dark.textSecondary, fontSize: FontSize.sm },
  syncPill: {
    marginTop: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 99,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  syncText: { color: Colors.dark.textSecondary, fontSize: FontSize.xs },
  sectionTitle: { color: Colors.dark.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  breakdownCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  breakdownRow: { gap: Spacing.sm },
  breakdownHeader: { flexDirection: "row", justifyContent: "space-between" },
  breakdownTitle: {
    color: Colors.dark.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  breakdownScore: { color: Colors.dark.textSecondary, fontSize: FontSize.xs },
  track: { height: 7, borderRadius: 4, backgroundColor: Colors.dark.border, overflow: "hidden" },
  fill: { height: 7, borderRadius: 4, backgroundColor: Colors.primary[400] },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: `${Colors.gold[500]}14`,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  disclaimerText: {
    flex: 1,
    color: Colors.dark.textSecondary,
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  mistakeButton: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: `${Colors.sakura[500]}55`,
    backgroundColor: `${Colors.sakura[500]}12`,
  },
  mistakeIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${Colors.sakura[500]}22`,
  },
  mistakeTitle: {
    color: Colors.dark.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  mistakeMeta: { color: Colors.dark.textMuted, fontSize: FontSize.xs, marginTop: 3 },
  mistakeCount: {
    minWidth: 27,
    height: 27,
    paddingHorizontal: 7,
    borderRadius: 14,
    textAlign: "center",
    textAlignVertical: "center",
    color: Colors.sakura[300],
    backgroundColor: `${Colors.sakura[500]}22`,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  reviewCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  reviewTop: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  resultIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewNumber: {
    flex: 1,
    color: Colors.dark.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  reviewStatus: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  reviewPrompt: {
    color: Colors.dark.text,
    fontSize: FontSize.base,
    lineHeight: 24,
    fontWeight: FontWeight.semibold,
  },
  transcriptCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.dark.surface,
    gap: 5,
  },
  transcriptLabel: {
    color: Colors.gold[300],
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  transcriptText: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
  reviewAnswer: { color: Colors.dark.textSecondary, fontSize: FontSize.sm },
  correctAnswer: { color: "#34D399", fontSize: FontSize.sm },
  explanation: {
    color: Colors.dark.textMuted,
    fontSize: FontSize.xs,
    lineHeight: 18,
    marginTop: 2,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary[500],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  primaryButtonText: { color: "#fff", fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  secondaryButton: {
    minHeight: 50,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.dark.card,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: Colors.dark.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
