import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createXpAttemptKey } from "@japangolearn/content";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { useAndroidBack } from "@/lib/use-android-back";
import { useVocabularySpeech } from "@/lib/use-vocabulary-speech";
import { saveLearningQuiz, type PracticeSaveResult } from "@/lib/kana-practice-save";
import { practiceCompliment } from "@/lib/kana-practice";
import {
  buildVocabularyQuiz,
  gradeVocabularyAnswer,
  writtenWord,
  type StudyWord,
  type VocabularyAnswer,
  type VocabularyQuestion,
} from "@/lib/vocabulary-study";
import { AuthPromptModal } from "./AuthPromptModal";

type Run = {
  id: string;
  userId?: string;
  questions: VocabularyQuestion[];
  answers: VocabularyAnswer[];
  index: number;
  finished: boolean;
  review: boolean;
  shownAt: number;
};
function PracticeButton({
  text,
  onPress,
  primary = false,
  disabled = false,
  testID,
}: {
  text: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      testID={testID}
      onPress={onPress}
      style={[s.button, primary && s.primary, disabled && { opacity: 0.4 }]}
    >
      <Text style={s.buttonText}>{text}</Text>
    </TouchableOpacity>
  );
}

export default function VocabularyPractice({
  words,
  allWords,
  label,
  onClose,
}: {
  words: StudyWord[];
  allWords: StudyWord[];
  label: string;
  onClose: () => void;
}) {
  const { session, refreshProfile } = useAuth();
  const { speak, stop, audioError } = useVocabularySpeech();
  const [size, setSize] = useState(10);
  const [run, setRun] = useState<Run | null>(null);
  const current = useRef<Run | null>(null);
  const [save, setSave] = useState<PracticeSaveResult>({ status: "guest" });
  const saving = useRef(new Set<string>());
  const mounted = useRef(true);
  const [exit, setExit] = useState(false);
  const [auth, setAuth] = useState(false);
  const setCurrent = useCallback((next: Run | null) => {
    current.current = next;
    setRun(next);
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const close = useCallback(() => {
    if (current.current && !current.current.finished) setExit(true);
    else {
      stop();
      onClose();
    }
  }, [stop, onClose]);
  useAndroidBack(true, close);

  const start = useCallback(
    (pool = words, review = false) => {
      stop();
      const questions = buildVocabularyQuiz(pool, allWords, review ? pool.length : size);
      if (!questions.length) return;
      setCurrent({
        id: createXpAttemptKey(),
        userId: session?.user.id,
        questions,
        answers: [],
        index: 0,
        finished: false,
        review,
        shownAt: Date.now(),
      });
      setSave({ status: session?.user.id ? "saving" : "guest" });
    },
    [words, allWords, size, stop, session?.user.id, setCurrent]
  );
  const submit = useCallback(
    async (attempt: Run) => {
      if (saving.current.has(attempt.id)) return;
      saving.current.add(attempt.id);
      setSave({ status: "saving" });
      try {
        const result = await saveLearningQuiz(
          "vocabulary_quiz",
          attempt.id,
          attempt.userId,
          attempt.answers,
          attempt.review
        );
        if (mounted.current && current.current?.id === attempt.id) {
          setSave(result);
          if (result.status === "submitted") void refreshProfile();
        }
      } finally {
        saving.current.delete(attempt.id);
      }
    },
    [refreshProfile]
  );
  const answer = useCallback(
    (value: string) => {
      const attempt = current.current;
      if (!attempt || attempt.finished || attempt.answers.length > attempt.index) return;
      const word = attempt.questions[attempt.index].word;
      setCurrent({
        ...attempt,
        answers: [
          ...attempt.answers,
          gradeVocabularyAnswer(word, value, Date.now() - attempt.shownAt),
        ],
      });
      void speak(word);
    },
    [setCurrent, speak]
  );
  const next = useCallback(() => {
    const attempt = current.current;
    if (!attempt || attempt.finished || attempt.answers.length <= attempt.index) return;
    stop();
    if (attempt.index + 1 === attempt.questions.length) {
      const completed = { ...attempt, finished: true };
      setCurrent(completed);
      void submit(completed);
    } else setCurrent({ ...attempt, index: attempt.index + 1, shownAt: Date.now() });
  }, [setCurrent, stop, submit]);
  const correct = run?.answers.filter((a) => a.isCorrect).length ?? 0;
  const percent = run?.answers.length ? Math.round((correct / run.answers.length) * 100) : 0;
  const mistakes = run?.answers.filter((a) => !a.isCorrect) ?? [];
  const compliment = practiceCompliment(percent, "words");
  const question = run?.questions[run.index];
  const answered = run?.answers[run.index];

  return (
    <View style={s.flex}>
      <View style={s.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Exit vocabulary practice"
          onPress={close}
          style={s.icon}
        >
          <Ionicons name="arrow-back" size={23} color="#fff" />
        </TouchableOpacity>
        <View style={s.flex}>
          <Text style={s.title}>Vocabulary practice</Text>
          <Text style={s.muted}>
            {!run
              ? label
              : run.finished
                ? "Set complete"
                : `${run.index + 1} of ${run.questions.length} · ${correct} correct`}
          </Text>
        </View>
        <Ionicons name="school-outline" size={22} color={Colors.primary[300]} />
      </View>
      {!run ? (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Text style={s.eyebrow}>A LITTLE, EVERY DAY</Text>
          <Text style={s.heading}>Make the words stick.</Text>
          <Text style={s.body}>
            Choose the English meaning. Take your time, then revisit the words you missed.
          </Text>
          <Text style={s.title}>Questions per set</Text>
          <View style={s.row}>
            {[5, 10, 15].map((n) => (
              <TouchableOpacity
                key={n}
                accessibilityRole="radio"
                accessibilityState={{ checked: size === n }}
                accessibilityLabel={`${n} vocabulary questions`}
                onPress={() => setSize(n)}
                style={[s.size, size === n && s.selected]}
              >
                <Text style={s.heading}>{n}</Text>
                <Text style={s.muted}>
                  {n === 5 ? "Warm-up" : n === 10 ? "Daily" : "Challenge"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.card}>
            <Text style={s.title}>{words.length} words available</Text>
            <Text style={s.body}>
              {label}. This set uses your current filters and saved-word selection.
            </Text>
            {words.length < size && (
              <Text style={s.muted}>You will practice {words.length} unique words, once each.</Text>
            )}
          </View>
          {
            <PracticeButton
              text={`Start ${Math.min(size, words.length)} questions`}
              onPress={() => start()}
              primary={true}
              disabled={words.length === 0}
              testID={"vocab-practice-start"}
            />
          }
          <Text style={s.muted}>
            {session
              ? "Earn 5 XP per correct answer when a completed set is saved. Reviewing mistakes does not award extra XP."
              : "Guest practice is welcome. Sign in to save account progress and earn XP on future sets."}
          </Text>
        </ScrollView>
      ) : run.finished ? (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.result}>
            <Ionicons name={percent >= 90 ? "trophy" : "sparkles"} size={48} color="#FBBF24" />
            <Text style={s.heading}>{run.review ? "Review complete!" : compliment.title}</Text>
            <Text style={s.body}>{compliment.message}</Text>
            <Text style={s.score} testID="vocab-practice-score">
              {percent}%
            </Text>
            <Text style={s.title}>
              {correct} of {run.answers.length} correct
            </Text>
          </View>
          <View style={s.card} testID="vocab-practice-save-status">
            <Text style={s.body}>
              {save.status === "saving"
                ? "Saving your practice…"
                : save.status === "submitted"
                  ? save.xp !== null
                    ? `Saved · +${save.xp} XP awarded`
                    : "Practice saved. Your account progress is updated."
                  : save.status === "queued"
                    ? "Saved on this device. Account progress and XP will update after syncing."
                    : save.status === "review"
                      ? "Mistakes reviewed. Your original score stays the same."
                      : save.status === "failed"
                        ? save.message
                        : "Guest practice complete. Sign in to earn XP on future sets."}
            </Text>
            {(save.status === "failed" || save.status === "queued") && (
              <PracticeButton text={"Try syncing"} onPress={() => void submit(run)} />
            )}
            {save.status === "guest" && (
              <PracticeButton text={"Sign in for future progress"} onPress={() => setAuth(true)} />
            )}
          </View>
          {mistakes.length > 0 && (
            <>
              <Text style={s.title}>Words to revisit · {mistakes.length}</Text>
              {mistakes.map((a) => (
                <View key={a.word.key} style={s.card}>
                  <Text style={s.japaneseSmall}>{writtenWord(a.word)}</Text>
                  <Text style={s.body}>
                    {a.word.hiragana} · {a.word.english}
                  </Text>
                  <Text style={s.muted}>{a.skipped ? "Skipped" : `Your answer: ${a.answer}`}</Text>
                  {<PracticeButton text={"Listen again"} onPress={() => void speak(a.word)} />}
                </View>
              ))}
              {
                <PracticeButton
                  text={"Review missed words"}
                  onPress={() =>
                    start(
                      mistakes.map((a) => a.word),
                      true
                    )
                  }
                  primary={true}
                />
              }
            </>
          )}
          {
            <PracticeButton
              text={"Choose another set"}
              onPress={() => {
                stop();
                setCurrent(null);
              }}
              primary={true}
            />
          }
          {<PracticeButton text={"Back to vocabulary"} onPress={onClose} />}
        </ScrollView>
      ) : question ? (
        <>
          <View style={s.track}>
            <View
              style={[
                s.progress,
                { width: `${((run.index + (answered ? 1 : 0)) / run.questions.length) * 100}%` },
              ]}
            />
          </View>
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            <View style={s.question}>
              <Text style={s.eyebrow}>CHOOSE THE MEANING</Text>
              <Text style={s.japanese} testID="vocab-practice-word">
                {writtenWord(question.word)}
              </Text>
              <Text style={s.body}>{question.word.hiragana}</Text>
              {<PracticeButton text={"Listen"} onPress={() => void speak(question.word)} />}
            </View>
            {question.options.map((option, index) => (
              <TouchableOpacity
                key={option}
                accessibilityRole="button"
                disabled={!!answered}
                accessibilityState={{ disabled: !!answered }}
                onPress={() => answer(option)}
                testID={`vocab-option-${index}`}
                style={[
                  s.option,
                  answered && option === question.word.english && s.correct,
                  answered && option === answered.answer && !answered.isCorrect && s.wrong,
                ]}
              >
                <Text style={s.optionText}>{option}</Text>
                {answered && option === question.word.english && (
                  <Ionicons name="checkmark-circle" size={22} color="#6EE7B7" />
                )}
              </TouchableOpacity>
            ))}
            {answered ? (
              <View accessibilityLiveRegion="polite" style={s.card}>
                <Text style={s.title}>
                  {answered.isCorrect ? "That's right!" : "Keep this one in mind"}
                </Text>
                <Text style={s.body}>
                  {writtenWord(question.word)} means {question.word.english}.
                </Text>
              </View>
            ) : (
              <PracticeButton text={"Not sure? Show the answer"} onPress={() => answer("")} />
            )}
            {audioError && (
              <Text style={s.muted}>
                Audio is unavailable. You can continue using the reading above.
              </Text>
            )}
          </ScrollView>
          <View style={s.footer}>
            {
              <PracticeButton
                text={run.index + 1 === run.questions.length ? "See results" : "Next word"}
                onPress={next}
                primary={true}
                disabled={!answered}
                testID={"vocab-practice-next"}
              />
            }
          </View>
        </>
      ) : null}
      <Modal visible={exit} transparent animationType="fade" onRequestClose={() => setExit(false)}>
        <View style={s.overlay}>
          <View style={s.dialog}>
            <Text style={s.heading}>Leave this set?</Text>
            <Text style={s.body}>Unfinished sets do not earn XP.</Text>
            {
              <PracticeButton
                text={"Keep practicing"}
                onPress={() => setExit(false)}
                primary={true}
              />
            }
            {
              <PracticeButton
                text={"Leave set"}
                onPress={() => {
                  stop();
                  onClose();
                }}
              />
            }
          </View>
        </View>
      </Modal>
      <AuthPromptModal
        visible={auth}
        feature="saved vocabulary progress"
        redirectTo="/(tabs)/vocabulary"
        onClose={() => setAuth(false)}
        description="Sign in to earn XP and sync completed practice on future sets."
      />
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderColor: Colors.dark.border,
  },
  icon: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  content: { padding: 18, gap: 16, paddingBottom: 28 },
  title: { color: "#F7F5FF", fontSize: 16, fontWeight: "700" },
  muted: { color: "#A6A0BD", fontSize: 12, lineHeight: 18 },
  body: { color: "#C9C3DE", fontSize: 14, lineHeight: 22 },
  eyebrow: { color: "#C4B5FD", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  heading: { color: "#F7F5FF", fontSize: 25, fontWeight: "800" },
  row: { flexDirection: "row", gap: 10 },
  size: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    gap: 6,
    alignItems: "center",
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  selected: { borderColor: "#A78BFA", backgroundColor: "#7C3AED30" },
  card: { backgroundColor: Colors.dark.card, padding: 16, borderRadius: 16, gap: 10 },
  button: {
    minHeight: 46,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#211837",
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: "#7C3AED" },
  buttonText: { color: "#F7F5FF", fontSize: 14, fontWeight: "700" },
  question: {
    backgroundColor: "#1A1533",
    borderRadius: 24,
    padding: 22,
    gap: 12,
    alignItems: "center",
  },
  japanese: { color: "#fff", fontSize: 38, lineHeight: 52, fontWeight: "700", textAlign: "center" },
  japaneseSmall: { color: "#fff", fontSize: 22 },
  option: {
    minHeight: 56,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.dark.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  optionText: { color: "#F7F5FF", fontSize: 15, flex: 1 },
  correct: { borderColor: "#34D399", backgroundColor: "#123B32" },
  wrong: { borderColor: "#FB7185", backgroundColor: "#421D30" },
  footer: { padding: 16, borderTopWidth: 1, borderColor: Colors.dark.border },
  track: { height: 3, backgroundColor: "#29203D" },
  progress: { height: 3, backgroundColor: "#A78BFA" },
  result: {
    padding: 22,
    alignItems: "center",
    gap: 14,
    borderRadius: 24,
    backgroundColor: "#211637",
  },
  score: { fontSize: 64, fontWeight: "800", color: "#fff" },
  overlay: { flex: 1, justifyContent: "center", backgroundColor: "#000A", padding: 24 },
  dialog: { backgroundColor: Colors.dark.card, borderRadius: 24, padding: 24, gap: 16 },
});
