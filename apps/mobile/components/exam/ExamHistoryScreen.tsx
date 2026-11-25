import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { loadExamAttempts } from "@/lib/exam-attempts";
import { getReadinessLabel, type ExamAttemptRecord } from "@/lib/exam-engine";

export default function ExamHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<ExamAttemptRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadExamAttempts(user?.id).then((records) => active && setAttempts(records));
      return () => {
        active = false;
      };
    }, [user?.id])
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={Colors.dark.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.eyebrow}>EXAM CENTER</Text>
          <Text style={styles.title}>Attempt history</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {attempts.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="time-outline" size={34} color={Colors.primary[300]} />
            </View>
            <Text style={styles.emptyTitle}>No completed attempts</Text>
            <Text style={styles.emptyText}>
              Complete a full mock or a section practice to start tracking progress.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace("/exam" as never)}
            >
              <Text style={styles.primaryButtonText}>Choose a practice</Text>
            </TouchableOpacity>
          </View>
        ) : (
          attempts.map((attempt) => (
            <TouchableOpacity
              key={attempt.id}
              style={styles.card}
              activeOpacity={0.78}
              onPress={() => router.push(`/exam/result?attemptId=${attempt.id}` as never)}
            >
              <View style={styles.cardTop}>
                <View style={styles.score}>
                  <Text style={styles.scoreValue}>{attempt.rawScorePercent}%</Text>
                  <Text style={styles.scoreLabel}>raw</Text>
                </View>
                <View style={styles.cardCopy}>
                  <Text style={styles.cardTitle}>
                    {attempt.mode === "full"
                      ? attempt.examTitle
                      : `${attempt.examTitle} · ${attempt.sectionResults[0]?.title ?? "Section practice"}`}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {getReadinessLabel(attempt.rawScorePercent)}
                  </Text>
                  <Text style={styles.cardDate}>
                    {new Date(attempt.completedAt).toLocaleString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={21} color={Colors.dark.textMuted} />
              </View>
              <View style={styles.cardBottom}>
                <View style={styles.meta}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={Colors.accent[300]} />
                  <Text style={styles.metaText}>
                    {attempt.correctAnswers}/{attempt.totalQuestions} correct
                  </Text>
                </View>
                <View style={styles.meta}>
                  <Ionicons
                    name={attempt.syncedAt ? "cloud-done-outline" : "phone-portrait-outline"}
                    size={16}
                    color={Colors.dark.textMuted}
                  />
                  <Text style={styles.metaText}>{attempt.syncedAt ? "Synced" : "On device"}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    minHeight: 82,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
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
  eyebrow: {
    color: Colors.primary[300],
    fontSize: 10,
    fontWeight: FontWeight.bold,
    textAlign: "center",
    letterSpacing: 1.3,
  },
  title: {
    color: Colors.dark.text,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: "center",
  },
  content: { padding: Spacing.lg, paddingBottom: 48, gap: Spacing.md },
  empty: { minHeight: 480, alignItems: "center", justifyContent: "center", gap: Spacing.md },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 26,
    backgroundColor: `${Colors.primary[500]}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { color: Colors.dark.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  emptyText: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 300,
  },
  primaryButton: {
    minHeight: 48,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: { color: "#fff", fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  card: {
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: "hidden",
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md, padding: Spacing.lg },
  score: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${Colors.primary[500]}22`,
  },
  scoreValue: { color: Colors.primary[300], fontSize: FontSize.base, fontWeight: FontWeight.bold },
  scoreLabel: { color: Colors.dark.textMuted, fontSize: 9, textTransform: "uppercase" },
  cardCopy: { flex: 1 },
  cardTitle: { color: Colors.dark.text, fontSize: FontSize.base, fontWeight: FontWeight.bold },
  cardSubtitle: { color: Colors.accent[300], fontSize: FontSize.xs, marginTop: 3 },
  cardDate: { color: Colors.dark.textMuted, fontSize: 10, marginTop: 5 },
  cardBottom: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { color: Colors.dark.textSecondary, fontSize: FontSize.xs },
});
