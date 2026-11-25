import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import type { Kana } from "@japangolearn/database";
import { createXpAttemptKey } from "@japangolearn/content";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { useAndroidBack } from "@/lib/use-android-back";
import { readCache, updateCache } from "@/lib/offline-cache";
import {
  buildKanaPractice,
  gradeKanaAnswer,
  practiceCandidates,
  practiceCompliment,
  practiceSummary,
  type PracticeAnswer,
  type PracticeQuestion,
  type PracticeScope,
} from "@/lib/kana-practice";
import { saveKanaPractice, type PracticeSaveResult } from "@/lib/kana-practice-save";
import { AuthPromptModal } from "./AuthPromptModal";

type Props = {
  kana: Kana[];
  script: "hiragana" | "katakana";
  initialGroup: string;
  groupLabel: string;
  onClose: () => void;
};
type Run = {
  id: string;
  userId?: string;
  questions: PracticeQuestion[];
  answers: PracticeAnswer[];
  index: number;
  finished: boolean;
  reviewOnly: boolean;
  hinted: boolean;
  startedAt: number;
  questionAt: number;
  duration: number;
};
type LocalRecord = {
  id: string;
  script: string;
  score: number;
  total: number;
  badge: string;
  completedAt: number;
};
type Icon = React.ComponentProps<typeof Ionicons>["name"];

function Button({
  label,
  icon,
  onPress,
  secondary = false,
  disabled = false,
  testID,
}: {
  label: string;
  icon?: Icon;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[s.button, secondary && s.secondary, disabled && s.disabled]}
    >
      {icon && <Ionicons name={icon} size={19} color={secondary ? Colors.primary[300] : "#fff"} />}
      <Text style={[s.buttonText, secondary && s.secondaryText]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Celebration({ perfect }: { perfect: boolean }) {
  const [motion] = useState(() => new Animated.Value(0));
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value);
    });
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  useEffect(() => {
    if (reduced) return;
    motion.setValue(0);
    const animation = Animated.timing(motion, {
      toValue: 1,
      duration: 2200,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [motion, reduced]);
  return (
    <View
      style={s.celebration}
      pointerEvents="none"
      accessibilityLabel={perfect ? "Congratulations, perfect set!" : "Congratulations, kana star!"}
    >
      {!reduced &&
        Array.from({ length: 18 }, (_, index) => (
          <Animated.View
            key={index}
            style={[
              s.confetti,
              {
                left: `${5 + ((index * 17) % 90)}%`,
                backgroundColor: ["#C4B5FD", "#FBBF24", "#2DD4BF", "#F472B6"][index % 4],
                opacity: motion.interpolate({
                  inputRange: [0, 0.15, 0.8, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                transform: [
                  {
                    translateY: motion.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20 - index * 5, 210 + index * 4],
                    }),
                  },
                  {
                    rotate: motion.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", `${180 + index * 25}deg`],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      <View style={s.medal}>
        <Ionicons name={perfect ? "trophy" : "ribbon"} size={38} color="#FBBF24" />
      </View>
    </View>
  );
}

export default function KanaPractice({ kana, script, initialGroup, groupLabel, onClose }: Props) {
  const { session, refreshProfile } = useAuth();
  const { height } = useWindowDimensions();
  const compact = height < 720;
  const [size, setSize] = useState<10 | 15 | 20>(10);
  const [scope, setScope] = useState<PracticeScope>(
    initialGroup === "loanword" ? "loanwords" : initialGroup === "All" ? "all" : "current"
  );
  const [run, setRun] = useState<Run | null>(null);
  const runRef = useRef<Run | null>(null);
  const [save, setSave] = useState<PracticeSaveResult>({ status: "guest" });
  const savingRef = useRef(new Set<string>());
  const [showExit, setShowExit] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const audioRequest = useRef(0);
  const mounted = useRef(true);
  const historyKey = `kana-practice-history:${session?.user.id ?? "guest"}`;
  const title = script === "hiragana" ? "Hiragana" : "Katakana";
  const candidates = useMemo(
    () => practiceCandidates(kana, scope, initialGroup),
    [kana, scope, initialGroup]
  );
  const count = Math.min(size, candidates.length);
  const summary = useMemo(() => practiceSummary(run?.answers ?? []), [run?.answers]);
  const compliment = practiceCompliment(summary.percent);
  const previous = records.filter((record) => record.script === script);
  const best = previous.length ? Math.max(...previous.map((record) => record.score)) : null;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      audioRequest.current = -1;
      void Speech.stop();
    };
  }, []);
  useEffect(() => {
    let active = true;
    void readCache<LocalRecord[]>(historyKey).then((cache) => {
      if (active && Array.isArray(cache?.data))
        setRecords(
          cache.data.filter(
            (record) => typeof record.score === "number" && typeof record.id === "string"
          )
        );
    });
    return () => {
      active = false;
    };
  }, [historyKey]);

  const updateRun = useCallback((value: Run | null) => {
    runRef.current = value;
    setRun(value);
  }, []);
  const stopAudio = useCallback(() => {
    audioRequest.current++;
    void Speech.stop();
    setSpeaking(false);
  }, []);
  const speak = useCallback((character: string) => {
    const request = ++audioRequest.current;
    setSpeaking(true);
    const finish = () => {
      if (mounted.current && audioRequest.current === request) setSpeaking(false);
    };
    void Speech.stop()
      .then(() => {
        if (!mounted.current || audioRequest.current !== request) return;
        Speech.speak(character, {
          language: "ja-JP",
          rate: 0.75,
          onDone: finish,
          onStopped: finish,
          onError: finish,
        });
      })
      .catch(finish);
  }, []);
  const requestExit = useCallback(() => {
    if (runRef.current && !runRef.current.finished) setShowExit(true);
    else onClose();
  }, [onClose]);
  useAndroidBack(true, requestExit);

  const begin = useCallback(
    (items = candidates, reviewOnly = false) => {
      stopAudio();
      const questions = buildKanaPractice(items, kana, reviewOnly ? items.length : size);
      if (!questions.length) return;
      const now = Date.now();
      updateRun({
        id: createXpAttemptKey(),
        userId: session?.user.id,
        questions,
        answers: [],
        index: 0,
        finished: false,
        reviewOnly,
        hinted: false,
        startedAt: now,
        questionAt: now,
        duration: 0,
      });
      setSave({ status: reviewOnly ? "review" : session ? "saving" : "guest" });
    },
    [candidates, kana, size, session, stopAudio, updateRun]
  );

  const answer = useCallback(
    (value: string) => {
      const current = runRef.current;
      if (!current || current.finished || current.answers.length > current.index) return;
      const item = current.questions[current.index].kana;
      const graded = gradeKanaAnswer(item, value, current.hinted, Date.now() - current.questionAt);
      updateRun({ ...current, answers: [...current.answers, graded] });
      speak(item.character);
    },
    [speak, updateRun]
  );
  const listenToQuestion = useCallback(() => {
    const active = runRef.current;
    if (!active || active.finished) return;
    if (!active.answers[active.index]) updateRun({ ...active, hinted: true });
    speak(active.questions[active.index].kana.character);
  }, [speak, updateRun]);

  const persist = useCallback(
    async (completed: Run) => {
      if (savingRef.current.has(completed.id)) return;
      savingRef.current.add(completed.id);
      setSave({ status: completed.reviewOnly ? "review" : completed.userId ? "saving" : "guest" });
      try {
        const result = await saveKanaPractice(
          completed.id,
          completed.userId,
          completed.answers,
          completed.reviewOnly
        );
        if (mounted.current && runRef.current?.id === completed.id) {
          setSave(result);
          if (result.status === "submitted") void refreshProfile();
        }
      } finally {
        savingRef.current.delete(completed.id);
      }
    },
    [refreshProfile]
  );

  const next = useCallback(() => {
    const current = runRef.current;
    if (!current || current.finished || current.answers.length <= current.index) return;
    stopAudio();
    if (current.index + 1 < current.questions.length) {
      updateRun({ ...current, index: current.index + 1, hinted: false, questionAt: Date.now() });
      return;
    }
    const completed = {
      ...current,
      finished: true,
      duration: Math.round((Date.now() - current.startedAt) / 1000),
    };
    updateRun(completed);
    void persist(completed);
    if (!completed.reviewOnly) {
      const score = practiceSummary(completed.answers).percent;
      const record = {
        id: completed.id,
        script,
        score,
        total: completed.answers.length,
        badge: practiceCompliment(score).badge,
        completedAt: Date.now(),
      };
      setRecords((old) => [record, ...old.filter((item) => item.id !== record.id)].slice(0, 30));
      void updateCache<LocalRecord[]>(historyKey, (old) =>
        [record, ...(Array.isArray(old) ? old.filter((item) => item.id !== record.id) : [])].slice(
          0,
          30
        )
      );
    }
  }, [stopAudio, updateRun, persist, script, historyKey]);

  const header = (subtitle: string) => (
    <View style={s.header}>
      <TouchableOpacity
        style={s.iconButton}
        onPress={requestExit}
        accessibilityRole="button"
        accessibilityLabel="Exit practice"
      >
        <Ionicons name="arrow-back" color={Colors.dark.text} size={22} />
      </TouchableOpacity>
      <View style={s.headerText}>
        <Text style={s.headerTitle}>{title} practice</Text>
        <Text style={s.muted}>{subtitle}</Text>
      </View>
      <Ionicons name="school-outline" size={23} color={Colors.primary[300]} />
    </View>
  );

  const saveMessage =
    save.status === "submitted"
      ? save.xp !== null
        ? `+${save.xp} XP added to your account`
        : "Practice saved. Your profile has the latest XP."
      : save.status === "queued"
        ? "Saved on this device. XP and progress will update after sync."
        : save.status === "saving"
          ? "Saving your practice and checking XP…"
          : save.status === "review"
            ? "Mistake review complete. Your original set's XP stays unchanged."
            : save.status === "failed"
              ? save.message
              : "Guest practice: sign in to earn account XP on future sets.";

  const renderSetup = () => (
    <>
      {header("A little practice, every day")}
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.intro}>
          <Text style={s.eyebrow}>MAKE IT YOUR SESSION</Text>
          <Text style={s.title}>Choose your pace.</Text>
          <Text style={s.body}>
            Read the kana, choose its sound, and learn from each answer. No timer pressure.
          </Text>
        </View>
        <Text style={s.sectionTitle}>Questions per set</Text>
        <View style={s.sizes}>
          {([10, 15, 20] as const).map((value) => (
            <TouchableOpacity
              key={value}
              style={[s.size, size === value && s.selected]}
              onPress={() => setSize(value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: size === value }}
              accessibilityLabel={`${value} questions`}
              testID={`practice-size-${value}`}
            >
              <Text style={s.sizeNumber}>{value}</Text>
              <Text style={s.muted}>
                {value === 10 ? "Quick" : value === 15 ? "Balanced" : "Full set"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.sectionTitle}>What would you like to review?</Text>
        <View style={s.scopes}>
          {(
            [
              ["all", "All kana"],
              ["basic", "Basic"],
              ["marked", "Sound marks"],
              ["combinations", "Combinations"],
              ...(script === "katakana" ? [["loanwords", "Loanword sounds"]] : []),
              ...(initialGroup !== "All" && initialGroup !== "loanword"
                ? [["current", groupLabel]]
                : []),
            ] as [PracticeScope, string][]
          ).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[s.scope, scope === value && s.selected]}
              onPress={() => setScope(value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: scope === value }}
              accessibilityLabel={label}
              testID={`practice-scope-${value}`}
            >
              <Text style={s.scopeText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.note}>
          <Ionicons name="sparkles-outline" size={19} color={Colors.primary[300]} />
          <Text style={s.noteText}>
            {session
              ? "Earn 5 XP per correct answer when your completed set is saved. Progress also counts toward your account achievements."
              : "You can practice as a guest. Sign in to save account progress and earn XP."}
          </Text>
        </View>
        {count < size && (
          <Text style={s.muted}>
            This group has {count} entries. You'll practice each once, without repeats.
          </Text>
        )}
        {best !== null && (
          <Text style={s.muted}>
            Recent best: {best}% · {previous.length} completed sets saved on this device
          </Text>
        )}
        <Button
          label={`Start ${count} questions`}
          icon="play"
          disabled={count === 0}
          onPress={() => begin()}
          testID="practice-start"
        />
        <Text style={s.footnote}>
          Listen is available as a hint. Review missed kana after your score.
        </Text>
      </ScrollView>
    </>
  );

  const renderQuestion = () => {
    if (!run) return null;
    const question = run.questions[run.index];
    const given = run.answers[run.index];
    return (
      <>
        {header(
          run.reviewOnly
            ? "Mistake review · no extra XP"
            : `${run.index + 1} of ${run.questions.length} · ${summary.correct} correct`
        )}
        <View
          style={s.progressTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: run.questions.length, now: run.answers.length }}
        >
          <View
            style={[
              s.progressFill,
              { width: `${(run.answers.length / run.questions.length) * 100}%` },
            ]}
          />
        </View>
        <ScrollView
          key={run.index}
          contentContainerStyle={s.questionContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.questionCard, compact && s.questionCompact]}>
            <Text style={s.eyebrow}>
              {question.kana.is_combo ? "READ THE COMBINATION" : "WHAT IS THE READING?"}
            </Text>
            <Text
              testID="practice-character"
              accessibilityLabel={question.kana.character}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.55}
              style={[
                s.character,
                {
                  fontSize: compact ? 70 : 88,
                  lineHeight: compact ? 86 : 112,
                  paddingVertical: compact ? 2 : 8,
                },
              ]}
            >
              {question.kana.character}
            </Text>
            <TouchableOpacity
              style={s.listen}
              accessibilityRole="button"
              accessibilityLabel={given ? "Listen again" : "Listen to a hint"}
              testID="practice-listen"
              onPress={listenToQuestion}
            >
              <Ionicons name="volume-medium-outline" size={18} color={Colors.primary[300]} />
              <Text style={s.link}>
                {speaking ? "Playing…" : given ? "Listen again" : "Listen · hint"}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={s.options}>
            {question.options.map((option, index) => {
              const correct = option.toLowerCase() === question.kana.romaji.trim().toLowerCase();
              const chosen = given?.answer === option;
              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => answer(option)}
                  disabled={!!given}
                  activeOpacity={0.8}
                  testID={`practice-option-${index}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !!given }}
                  accessibilityLabel={
                    given
                      ? `${option}${correct ? ", correct answer" : chosen ? ", your answer, incorrect" : ""}`
                      : option
                  }
                  style={[
                    s.option,
                    given && correct && s.correct,
                    given && chosen && !correct && s.incorrect,
                  ]}
                >
                  <Text style={[s.optionText, given && correct && s.correctText]}>{option}</Text>
                  {given && (correct || chosen) && (
                    <Ionicons
                      name={correct ? "checkmark-circle" : "close-circle"}
                      color={correct ? "#34D399" : "#FB7185"}
                      size={20}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {given ? (
            <View
              style={[s.feedback, given.isCorrect ? s.correct : s.incorrect]}
              accessibilityLiveRegion="polite"
            >
              <Text style={s.feedbackTitle}>
                {given.isCorrect
                  ? "Correct!"
                  : given.skipped
                    ? "Let's learn this one"
                    : "Good try — here's the reading"}
              </Text>
              <Text style={s.feedbackReading}>
                {question.kana.character} → {question.kana.romaji}
                {question.kana.romaji_hindi ? ` · ${question.kana.romaji_hindi}` : ""}
              </Text>
              {!given.isCorrect && (
                <Text style={s.muted}>You'll be able to review this kana after the set.</Text>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={s.skip}
              onPress={() => answer("")}
              accessibilityRole="button"
              accessibilityLabel="Skip and show answer"
              testID="practice-skip"
            >
              <Text style={s.muted}>Not sure? Show the answer</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        <View style={s.bottomAction}>
          <Button
            label={run.index === run.questions.length - 1 ? "See my results" : "Next question"}
            icon="arrow-forward"
            disabled={!given}
            onPress={next}
            testID="practice-next"
          />
        </View>
      </>
    );
  };

  const renderResults = () => {
    if (!run) return null;
    return (
      <>
        {header(run.reviewOnly ? "Review complete" : "Set complete")}
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.resultHero}>
            {compliment.celebrate && !run.reviewOnly ? (
              <Celebration key={run.id} perfect={summary.percent === 100} />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={48} color={Colors.primary[300]} />
            )}
            <Text style={s.resultTitle}>
              {run.reviewOnly ? "Review complete!" : compliment.title}
            </Text>
            <Text style={s.resultMessage}>
              {run.reviewOnly
                ? "You've given these kana another look. Keep building the habit."
                : compliment.message}
            </Text>
            <Text style={s.score} testID="practice-score">
              {summary.percent}%
            </Text>
            <Text style={s.muted}>
              {summary.correct} of {summary.total} correct
            </Text>
            {!run.reviewOnly && (
              <View style={s.resultBadge}>
                <Ionicons
                  name={summary.percent >= 90 ? "ribbon" : "leaf-outline"}
                  color="#FBBF24"
                  size={17}
                />
                <Text style={s.resultBadgeText}>{compliment.badge}</Text>
              </View>
            )}
          </View>
          <View style={s.stats}>
            <View>
              <Text style={s.statNumber}>{summary.bestStreak}</Text>
              <Text style={s.muted}>Best streak</Text>
            </View>
            <View>
              <Text style={s.statNumber}>{summary.hinted}</Text>
              <Text style={s.muted}>Audio hints</Text>
            </View>
            <View>
              <Text style={s.statNumber}>
                {Math.floor(run.duration / 60)}:{String(run.duration % 60).padStart(2, "0")}
              </Text>
              <Text style={s.muted}>Time spent</Text>
            </View>
          </View>
          <View style={s.saveNotice} accessibilityLiveRegion="polite">
            <Ionicons
              name={
                save.status === "submitted"
                  ? "checkmark-circle"
                  : save.status === "queued"
                    ? "cloud-upload-outline"
                    : "sparkles-outline"
              }
              size={22}
              color={Colors.primary[300]}
            />
            <Text style={s.noteText} testID="practice-save-status">
              {saveMessage}
            </Text>
          </View>
          {(save.status === "failed" || save.status === "queued") && (
            <Button
              label="Check sync again"
              icon="sync-outline"
              secondary
              onPress={() => void persist(run)}
            />
          )}
          {save.status === "guest" && (
            <Button
              label="Sign in for future progress"
              secondary
              icon="person-outline"
              onPress={() => setShowAuth(true)}
            />
          )}
          {summary.mistakes.length > 0 && (
            <>
              <View style={s.row}>
                <Text style={s.sectionTitle}>A little more practice</Text>
                <Text style={s.muted}>{summary.mistakes.length} to review</Text>
              </View>
              <View style={s.reviewList}>
                {summary.mistakes.map((item) => (
                  <View key={item.itemId} style={s.reviewRow}>
                    <Text style={s.reviewCharacter}>{item.kana.character}</Text>
                    <View style={s.headerText}>
                      <Text style={s.reviewReading}>{item.correctAnswer}</Text>
                      <Text style={s.muted}>
                        {item.skipped ? "Skipped" : `Your answer: ${item.answer}`}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={s.iconButton}
                      onPress={() => speak(item.kana.character)}
                      accessibilityRole="button"
                      accessibilityLabel={`Listen to ${item.kana.character}`}
                    >
                      <Ionicons
                        name="volume-medium-outline"
                        color={Colors.primary[300]}
                        size={21}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <Button
                label={`Review ${summary.mistakes.length} missed kana`}
                icon="refresh-outline"
                onPress={() =>
                  begin(
                    summary.mistakes.map((item) => item.kana),
                    true
                  )
                }
                testID="practice-review-mistakes"
              />
            </>
          )}
          <Button
            label="Choose another set"
            icon="options-outline"
            secondary
            onPress={() => {
              stopAudio();
              updateRun(null);
            }}
            testID="practice-new-set"
          />
          <Button label="Back to characters" secondary onPress={onClose} />
        </ScrollView>
      </>
    );
  };

  return (
    <View style={s.container}>
      {!run ? renderSetup() : run.finished ? renderResults() : renderQuestion()}
      <Modal
        transparent
        visible={showExit}
        animationType="fade"
        onRequestClose={() => setShowExit(false)}
      >
        <View style={s.modalShade}>
          <View style={s.modalCard}>
            <Text style={s.resultTitle}>Leave this set?</Text>
            <Text style={s.body}>
              Your unfinished set won't earn XP. You can keep practicing or return to the
              characters.
            </Text>
            <Button label="Keep practicing" onPress={() => setShowExit(false)} />
            <Button
              label="Leave set"
              secondary
              onPress={() => {
                stopAudio();
                setShowExit(false);
                onClose();
              }}
            />
          </View>
        </View>
      </Modal>
      <AuthPromptModal
        visible={showAuth}
        feature="practice progress"
        redirectTo="/(tabs)/writing"
        description="Sign in to earn XP and save your future kana practice across devices."
        onClose={() => setShowAuth(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    backgroundColor: Colors.dark.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  headerText: { flex: 1 },
  headerTitle: { color: Colors.dark.text, fontSize: 17, fontWeight: "700", marginBottom: 3 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  intro: { paddingVertical: 6, gap: 10 },
  eyebrow: { color: Colors.primary[300], fontSize: 10, fontWeight: "700", letterSpacing: 1.3 },
  title: { color: Colors.dark.text, fontSize: 30, fontWeight: "800", letterSpacing: -0.6 },
  body: { color: Colors.dark.textSecondary, fontSize: 14, lineHeight: 22 },
  muted: { color: Colors.dark.textSecondary, fontSize: 12, lineHeight: 18 },
  sectionTitle: { color: Colors.dark.text, fontSize: 14, fontWeight: "700" },
  sizes: { flexDirection: "row", gap: 10 },
  size: {
    flex: 1,
    minHeight: 91,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sizeNumber: { color: Colors.dark.text, fontSize: 26, fontWeight: "800" },
  selected: { backgroundColor: Colors.primary[900], borderColor: Colors.primary[400] },
  scopes: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  scope: {
    minHeight: 44,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.dark.card,
    borderColor: Colors.dark.border,
    borderWidth: 1,
  },
  scopeText: { color: Colors.dark.text, fontSize: 12, fontWeight: "600" },
  note: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.dark.card,
  },
  noteText: { flex: 1, color: Colors.dark.textSecondary, fontSize: 13, lineHeight: 21 },
  button: {
    minHeight: 48,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
    backgroundColor: Colors.primary[600],
  },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  secondary: { backgroundColor: Colors.dark.card, borderWidth: 1, borderColor: Colors.dark.border },
  secondaryText: { color: Colors.primary[200] },
  disabled: { opacity: 0.4 },
  footnote: { color: Colors.dark.textMuted, fontSize: 11, lineHeight: 17, textAlign: "center" },
  progressTrack: {
    height: 4,
    marginHorizontal: 16,
    backgroundColor: Colors.dark.surface,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: 4, backgroundColor: Colors.primary[400] },
  questionContent: { padding: 16, gap: 14, paddingBottom: 20 },
  questionCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  questionCompact: { paddingVertical: 12 },
  character: {
    width: "100%",
    color: Colors.dark.text,
    textAlign: "center",
    fontWeight: "500",
    paddingVertical: 8,
    lineHeight: 112,
    includeFontPadding: false,
  },
  listen: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
  },
  link: { color: Colors.primary[300], fontSize: 12, fontWeight: "600" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  option: {
    width: "48%",
    flexGrow: 1,
    minHeight: 62,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    borderRadius: 15,
    backgroundColor: Colors.dark.card,
  },
  optionText: { fontSize: 21, fontWeight: "700", color: Colors.dark.text },
  correct: { borderColor: "#34D399", backgroundColor: "#10B98118" },
  incorrect: { borderColor: "#FB7185", backgroundColor: "#F43F5E12" },
  correctText: { color: "#34D399" },
  feedback: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  feedbackTitle: { color: Colors.dark.text, fontSize: 13, fontWeight: "700" },
  feedbackReading: { color: Colors.dark.text, fontSize: 18, lineHeight: 28 },
  skip: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  bottomAction: {
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    backgroundColor: Colors.dark.bg,
  },
  resultHero: {
    alignItems: "center",
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 22,
    borderRadius: 24,
    gap: 10,
    overflow: "hidden",
  },
  resultTitle: { color: Colors.dark.text, fontSize: 24, fontWeight: "800", textAlign: "center" },
  resultMessage: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  score: { color: Colors.dark.text, fontSize: 58, fontWeight: "800", marginTop: 4 },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FBBF2415",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
  },
  resultBadgeText: { color: "#FBBF24", fontSize: 12, fontWeight: "700" },
  stats: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 8 },
  statNumber: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 3,
  },
  saveNotice: {
    flexDirection: "row",
    gap: 10,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  reviewList: { borderRadius: 16, backgroundColor: Colors.dark.card, paddingHorizontal: 12 },
  reviewRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  reviewCharacter: { color: Colors.dark.text, fontSize: 30, minWidth: 68, textAlign: "center" },
  reviewReading: { color: Colors.dark.text, fontSize: 15, fontWeight: "700", marginBottom: 3 },
  celebration: { width: "100%", height: 84, alignItems: "center", justifyContent: "center" },
  medal: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FBBF2415",
    borderWidth: 1,
    borderColor: "#FBBF2455",
    alignItems: "center",
    justifyContent: "center",
  },
  confetti: { position: "absolute", top: 0, width: 7, height: 11, borderRadius: 2 },
  modalShade: {
    flex: 1,
    backgroundColor: "#000A",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    padding: 22,
    borderRadius: 22,
    backgroundColor: Colors.dark.card,
    gap: 18,
  },
});
