import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { LISTENING_AUDIO } from "@/lib/exam-audio";
import { saveExamAttempt } from "@/lib/exam-attempts";
import { getExamDefinition, getExamQuestion, getExamSection, N5_MOCK_1 } from "@/lib/exam-content";
import { getInstalledListeningAudioUri } from "@/lib/exam-packs";
import {
  calculateAttemptResult,
  createClientUuid,
  formatTimer,
  type ExamAnswerMap,
  type ExamAttemptRecord,
  type ExamMode,
} from "@/lib/exam-engine";

export default function ExamRunnerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    mode?: string;
    section?: string;
    questionIds?: string;
    examId?: string;
  }>();
  const routeMode =
    params.mode === "review" ? "review" : params.mode === "section" ? "section" : "full";
  const mode: ExamMode = routeMode === "full" ? "full" : "section";
  const requestedExam = getExamDefinition(params.examId);
  const selectedExam = requestedExam ?? N5_MOCK_1;
  const hasInvalidExam = Boolean(params.examId && !requestedExam);
  const selectedSection = getExamSection(
    routeMode === "review" ? "listening" : params.section,
    selectedExam.id
  );
  const reviewQuestionIds = useMemo(
    () => new Set((params.questionIds ?? "").split(",").filter(Boolean)),
    [params.questionIds]
  );
  const sections = useMemo(() => {
    if (routeMode === "review" && selectedSection) {
      const questions = [...reviewQuestionIds]
        .map((questionId) => getExamQuestion(questionId))
        .filter((question): question is NonNullable<typeof question> => Boolean(question));
      return [
        {
          ...selectedSection,
          title: "Listening Mistakes",
          shortTitle: "Review",
          durationSeconds: Math.max(5 * 60, questions.length * 60),
          questions,
        },
      ];
    }
    if (mode === "section" && selectedSection) return [selectedSection];
    return [...selectedExam.sections];
  }, [mode, reviewQuestionIds, routeMode, selectedExam, selectedSection]);
  const [hasStarted, setHasStarted] = useState(false);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<ExamAnswerMap>({});
  const [remainingSeconds, setRemainingSeconds] = useState(sections[0]?.durationSeconds ?? 0);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const [offlineAudio, setOfflineAudio] = useState<{ questionId: string; uri: string } | null>(
    null
  );
  const startedAtRef = useRef<string>("");
  const finishingRef = useRef(false);
  const expireRef = useRef<() => void>(() => undefined);

  const section = sections[sectionIndex];
  const question = section?.questions[questionIndex];
  useEffect(() => {
    let active = true;
    const questionId = question?.audioScript ? question.id : undefined;
    if (!questionId) {
      setOfflineAudio(null);
      return () => {
        active = false;
      };
    }
    void getInstalledListeningAudioUri(questionId).then((uri) => {
      if (active) setOfflineAudio(uri ? { questionId, uri } : null);
    });
    return () => {
      active = false;
    };
  }, [question?.audioScript, question?.id]);
  const installedAudioUri = offlineAudio?.questionId === question?.id ? offlineAudio.uri : null;
  const audioSource = installedAudioUri ?? (question ? LISTENING_AUDIO[question.id] : undefined);
  const audioPlayer = useAudioPlayer(audioSource ?? null, { updateInterval: 200 });
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const isLastQuestion = !!section && questionIndex === section.questions.length - 1;
  const isLastSection = sectionIndex === sections.length - 1;
  const answeredCount = sections.reduce(
    (count, item) =>
      count + item.questions.filter((entry) => answers[entry.id] !== undefined).length,
    0
  );
  const totalQuestions = sections.reduce((count, item) => count + item.questions.length, 0);

  const finishAttempt = () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    audioPlayer.pause();
    const completedAt = new Date().toISOString();
    const startedAt = startedAtRef.current || completedAt;
    const result = calculateAttemptResult(sections, answers);
    const attempt: ExamAttemptRecord = {
      id: createClientUuid(),
      examId: selectedExam.id,
      examTitle: selectedExam.title,
      mode,
      sectionId: mode === "section" ? (sections[0]?.id ?? null) : null,
      startedAt,
      completedAt,
      durationSeconds: Math.max(
        0,
        Math.round((Date.parse(completedAt) - Date.parse(startedAt)) / 1000)
      ),
      ...result,
      answers,
      syncedAt: null,
    };
    void saveExamAttempt(attempt, user?.id);
    router.replace(`/exam/result?attemptId=${attempt.id}` as never);
  };

  const movePastSection = (fromTimeout = false) => {
    audioPlayer.pause();
    if (isLastSection) {
      void finishAttempt();
      return;
    }
    setSectionIndex((current) => current + 1);
    setQuestionIndex(0);
    if (fromTimeout) {
      Alert.alert("Time is up", "The next section has started.");
    }
  };

  expireRef.current = () => movePastSection(true);

  useEffect(() => {
    if (!hasStarted || !section) return;
    const deadline = Date.now() + section.durationSeconds * 1000;
    setRemainingSeconds(section.durationSeconds);
    let expired = false;
    const timer = setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemainingSeconds(next);
      if (next === 0 && !expired) {
        expired = true;
        clearInterval(timer);
        expireRef.current();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [hasStarted, section, sectionIndex]);

  const confirmExit = () => {
    Alert.alert("Leave this attempt?", "Your unfinished answers will not be saved.", [
      { text: "Continue test", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          audioPlayer.pause();
          router.back();
        },
      },
    ]);
  };

  const goNext = () => {
    if (!isLastQuestion) {
      setQuestionIndex((current) => current + 1);
      return;
    }
    if (!isLastSection) {
      Alert.alert("Section complete", "You cannot return after starting the next timed section.", [
        { text: "Review", style: "cancel" },
        { text: "Start next section", onPress: () => movePastSection() },
      ]);
      return;
    }
    const unanswered = totalQuestions - answeredCount;
    Alert.alert(
      "Submit attempt?",
      unanswered > 0
        ? `${unanswered} question${unanswered === 1 ? " is" : "s are"} unanswered.`
        : "Your result will be saved to attempt history.",
      [
        { text: "Review", style: "cancel" },
        { text: "Submit", onPress: () => void finishAttempt() },
      ]
    );
  };

  const playListening = async () => {
    if (!question?.audioScript || !audioSource || !audioStatus.isLoaded) return;
    if (audioStatus.playing) {
      audioPlayer.pause();
      return;
    }
    const count = playCounts[question.id] ?? 0;
    if (count >= 2) return;
    setPlayCounts((current) => ({ ...current, [question.id]: count + 1 }));
    await audioPlayer.seekTo(0);
    audioPlayer.play();
  };

  const invalidSelection =
    hasInvalidExam ||
    (routeMode === "section" && !selectedSection) ||
    (routeMode === "review" && (!selectedSection || sections[0]?.questions.length === 0));

  if (invalidSelection) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.errorTitle}>Section not found</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace("/exam" as never)}
        >
          <Text style={styles.primaryButtonText}>Back to Exam Center</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hasStarted) {
    return (
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={[
            styles.instructionsContent,
            { paddingTop: insets.top + Spacing.md },
          ]}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => router.back()}
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color={Colors.dark.text} />
          </TouchableOpacity>
          <View style={styles.instructionsIcon}>
            <Ionicons name="shield-checkmark-outline" size={36} color={Colors.primary[300]} />
          </View>
          <Text style={styles.instructionsEyebrow}>
            {routeMode === "full"
              ? "FULL MOCK"
              : routeMode === "review"
                ? "MISTAKE REVIEW"
                : "SECTION PRACTICE"}
          </Text>
          <Text style={styles.instructionsTitle}>
            {routeMode === "full" ? selectedExam.title : sections[0]?.title}
          </Text>
          <Text style={styles.instructionsText}>
            Each section has its own timer. When time reaches zero, the app moves forward
            automatically.
          </Text>

          <View style={styles.rulesCard}>
            {sections.map((item) => (
              <View key={item.id} style={styles.ruleRow}>
                <View style={[styles.ruleDot, { backgroundColor: item.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.ruleTitle}>{item.title}</Text>
                  <Text style={styles.ruleMeta}>{item.questions.length} questions</Text>
                </View>
                <Text style={styles.ruleTime}>{item.durationSeconds / 60} min</Text>
              </View>
            ))}
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="headset-outline" size={20} color={Colors.gold[300]} />
            <Text style={styles.tipText}>
              Original Japanese audio is included in the app for offline playback. Each clip can be
              started twice during a timed attempt.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              startedAtRef.current = new Date().toISOString();
              setHasStarted(true);
            }}
          >
            <Text style={styles.primaryButtonText}>Begin timed attempt</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (!section || !question) return null;

  const selectedChoice = answers[question.id];
  const playbackCount = playCounts[question.id] ?? 0;
  const sectionProgress = ((questionIndex + 1) / section.questions.length) * 100;

  return (
    <View style={styles.screen}>
      <View style={[styles.runnerHeader, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={confirmExit}
          accessibilityLabel="Close attempt"
        >
          <Ionicons name="close" size={23} color={Colors.dark.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerSection}>{section.shortTitle}</Text>
          <Text style={styles.headerProgress}>
            Question {questionIndex + 1} of {section.questions.length}
          </Text>
        </View>
        <View style={[styles.timerPill, remainingSeconds <= 60 && styles.timerDanger]}>
          <Ionicons
            name="timer-outline"
            size={17}
            color={remainingSeconds <= 60 ? "#FCA5A5" : Colors.gold[300]}
          />
          <Text style={[styles.timerText, remainingSeconds <= 60 && { color: "#FCA5A5" }]}>
            {formatTimer(remainingSeconds)}
          </Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${sectionProgress}%`, backgroundColor: section.color },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.questionContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.skillRow}>
          <Text style={[styles.skillBadge, { color: section.color }]}>{question.skill}</Text>
          <Text style={styles.answeredMeta}>
            {answeredCount}/{totalQuestions} answered
          </Text>
        </View>
        <Text style={styles.instruction}>{question.instruction}</Text>

        {question.audioScript ? (
          <TouchableOpacity
            style={[
              styles.audioCard,
              !audioStatus.isLoaded && { opacity: 0.55 },
              playbackCount >= 2 && !audioStatus.playing && { opacity: 0.55 },
            ]}
            onPress={() => void playListening()}
            disabled={!audioStatus.isLoaded || (playbackCount >= 2 && !audioStatus.playing)}
          >
            <LinearGradient
              colors={[`${section.color}55`, `${section.color}18`]}
              style={styles.audioGradient}
            >
              <View style={styles.playIcon}>
                <Ionicons name={audioStatus.playing ? "pause" : "play"} size={26} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.audioTitle}>
                  {!audioStatus.isLoaded
                    ? "Loading audio…"
                    : audioStatus.playing
                      ? "Playing original audio"
                      : playbackCount === 0
                        ? "Play Japanese audio"
                        : "Play again"}
                </Text>
                <Text style={styles.audioMeta}>
                  {2 - playbackCount} play{2 - playbackCount === 1 ? "" : "s"} remaining
                </Text>
              </View>
              <View style={styles.wave}>
                <View style={styles.waveBar} />
                <View style={[styles.waveBar, { height: 24 }]} />
                <View style={[styles.waveBar, { height: 15 }]} />
                <View style={[styles.waveBar, { height: 28 }]} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}

        {question.passage ? (
          <View style={styles.passageCard}>
            <Text style={styles.passageText}>{question.passage}</Text>
          </View>
        ) : null}
        <Text style={styles.prompt}>{question.prompt}</Text>

        <View style={styles.options}>
          {question.choices.map((choice, index) => {
            const isSelected = selectedChoice === index;
            return (
              <TouchableOpacity
                key={`${question.id}-${index}`}
                style={[
                  styles.option,
                  isSelected && {
                    borderColor: section.color,
                    backgroundColor: `${section.color}18`,
                  },
                ]}
                onPress={() => setAnswers((current) => ({ ...current, [question.id]: index }))}
                activeOpacity={0.76}
              >
                <View
                  style={[
                    styles.optionLetter,
                    isSelected && { backgroundColor: section.color, borderColor: section.color },
                  ]}
                >
                  <Text style={[styles.optionLetterText, isSelected && { color: "#fff" }]}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>
                <Text style={styles.optionText}>{choice}</Text>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color={section.color} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <TouchableOpacity
          style={[styles.navButton, questionIndex === 0 && styles.navDisabled]}
          disabled={questionIndex === 0}
          onPress={() => setQuestionIndex((current) => current - 1)}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={questionIndex === 0 ? Colors.dark.textMuted : Colors.dark.text}
          />
          <Text
            style={[styles.navButtonText, questionIndex === 0 && { color: Colors.dark.textMuted }]}
          >
            Previous
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navButton, styles.nextButton, { backgroundColor: section.color }]}
          onPress={goNext}
        >
          <Text style={styles.nextButtonText}>
            {isLastQuestion && isLastSection ? "Submit" : isLastQuestion ? "Next section" : "Next"}
          </Text>
          <Ionicons
            name={isLastQuestion && isLastSection ? "checkmark" : "arrow-forward"}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
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
  errorTitle: { color: Colors.dark.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  instructionsContent: {
    minHeight: "100%",
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
    justifyContent: "center",
    gap: Spacing.lg,
  },
  closeButton: {
    position: "absolute",
    top: 0,
    right: Spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dark.card,
    alignItems: "center",
    justifyContent: "center",
  },
  instructionsIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: `${Colors.primary[500]}20`,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  instructionsEyebrow: {
    textAlign: "center",
    color: Colors.primary[300],
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.5,
  },
  instructionsTitle: {
    color: Colors.dark.text,
    fontSize: FontSize["3xl"],
    lineHeight: 36,
    textAlign: "center",
    fontWeight: FontWeight.black,
  },
  instructionsText: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 21,
    textAlign: "center",
  },
  rulesCard: {
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: Spacing.lg,
  },
  ruleRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  ruleDot: { width: 10, height: 10, borderRadius: 5 },
  ruleTitle: { color: Colors.dark.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  ruleMeta: { color: Colors.dark.textMuted, fontSize: FontSize.xs, marginTop: 3 },
  ruleTime: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  tipCard: {
    flexDirection: "row",
    gap: Spacing.sm,
    backgroundColor: `${Colors.gold[500]}16`,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  tipText: { flex: 1, color: Colors.dark.textSecondary, fontSize: FontSize.xs, lineHeight: 18 },
  primaryButton: {
    minHeight: 54,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary[500],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  primaryButtonText: { color: "#fff", fontSize: FontSize.base, fontWeight: FontWeight.bold },
  runnerHeader: {
    minHeight: 74,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
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
  headerCenter: { alignItems: "center" },
  headerSection: { color: Colors.dark.text, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  headerProgress: { color: Colors.dark.textMuted, fontSize: 10, marginTop: 2 },
  timerPill: {
    minWidth: 82,
    height: 40,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: `${Colors.gold[500]}16`,
  },
  timerDanger: { backgroundColor: "rgba(239,68,68,0.18)" },
  timerText: {
    color: Colors.gold[300],
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  progressTrack: { height: 3, backgroundColor: Colors.dark.border },
  progressFill: { height: 3 },
  questionContent: { padding: Spacing.lg, paddingBottom: 120, gap: Spacing.lg },
  skillRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  skillBadge: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  answeredMeta: { color: Colors.dark.textMuted, fontSize: FontSize.xs },
  instruction: { color: Colors.dark.textSecondary, fontSize: FontSize.sm, lineHeight: 21 },
  prompt: {
    color: Colors.dark.text,
    fontSize: FontSize.xl,
    lineHeight: 33,
    fontWeight: FontWeight.bold,
  },
  passageCard: {
    padding: Spacing.lg,
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent[500],
  },
  passageText: { color: Colors.dark.text, fontSize: FontSize.base, lineHeight: 27 },
  audioCard: { borderRadius: BorderRadius.xl, overflow: "hidden" },
  audioGradient: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  playIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.sakura[500],
    alignItems: "center",
    justifyContent: "center",
  },
  audioTitle: { color: Colors.dark.text, fontSize: FontSize.base, fontWeight: FontWeight.bold },
  audioMeta: { color: Colors.dark.textSecondary, fontSize: FontSize.xs, marginTop: 4 },
  wave: { flexDirection: "row", gap: 3, alignItems: "center" },
  waveBar: { width: 3, height: 18, borderRadius: 2, backgroundColor: Colors.sakura[300] },
  options: { gap: Spacing.md },
  option: {
    minHeight: 64,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  optionLetter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLetterText: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  optionText: { flex: 1, color: Colors.dark.text, fontSize: FontSize.base, lineHeight: 22 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.dark.bg,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  navButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: BorderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.dark.card,
  },
  navDisabled: { opacity: 0.45 },
  navButtonText: {
    color: Colors.dark.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  nextButton: { flex: 1.25 },
  nextButtonText: { color: "#fff", fontSize: FontSize.sm, fontWeight: FontWeight.bold },
});
