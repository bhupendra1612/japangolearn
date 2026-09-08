import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import { createXpAttemptKey } from "@japangolearn/content";
import type { PracticeList } from "@japangolearn/database";
import {
  toGradedAnswerPayload,
  type OfflineJson,
  type GradedAnswer,
  type PracticeStudyItem,
} from "@japangolearn/core";
import {
  addPracticeListItemWithQueue,
  createPracticeListWithQueue,
  submitLearningAttemptWithQueue,
} from "@/lib/offline-queue";
import { loadPracticeStudyItems } from "@/lib/practice-content";
import { updateCache } from "@/lib/offline-cache";

type QuizItem = PracticeStudyItem;

export default function QuizScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;

  const [questions, setQuestions] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [quizAttemptKey, setQuizAttemptKey] = useState(() => createXpAttemptKey());
  const answersRef = useRef<GradedAnswer[]>([]);
  const questionShownAtRef = useRef<number>(Date.now());
  const needsPracticeListIdRef = useRef<string | null>(null);
  const needsPracticeListPromiseRef = useRef<Promise<string | null> | null>(null);
  const answerLockRef = useRef(false);

  const generateOptions = useCallback((allQuestions: QuizItem[], correctIndex: number) => {
    if (allQuestions.length === 0) return;
    const correctAnswer = allQuestions[correctIndex].back;
    const wrongAnswers = allQuestions
      .filter((_, index) => index !== correctIndex)
      .map((question) => question.back)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    while (wrongAnswers.length < 3) {
      wrongAnswers.push(`Option ${wrongAnswers.length + 1}`);
    }

    setOptions([correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5));
  }, []);

  const loadQuiz = useCallback(async () => {
    if (!userId) {
      setQuestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setQuestions([]);
    setIsSubmitting(false);
    answerLockRef.current = false;
    setQuizAttemptKey(createXpAttemptKey());
    answersRef.current = [];
    questionShownAtRef.current = Date.now();
    const studyItems = await loadPracticeStudyItems(supabase, listId);
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    if (currentSession?.user.id !== userId) return;
    const shuffled = [...studyItems].sort(() => Math.random() - 0.5).slice(0, 100);
    setQuestions(shuffled);
    generateOptions(shuffled, 0);
    setLoading(false);
  }, [generateOptions, listId, userId]);

  useEffect(() => {
    if (listId && userId) void loadQuiz();
  }, [listId, loadQuiz, userId]);

  const handleSelect = async (opt: string) => {
    if (answerLockRef.current || selectedOption !== null || isSubmitting) return;
    if (!userId) return;
    answerLockRef.current = true;
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    if (currentSession?.user.id !== userId) {
      answerLockRef.current = false;
      return;
    }

    setSelectedOption(opt);
    const correctAns = questions[currentIndex].back;
    const correct = opt === correctAns;
    setIsCorrect(correct);

    if (correct) {
      setScore((s) => s + 1);
      Speech.speak("Correct", { language: "en-US" }); // optional sound feedback
    }

    const currentQ = questions[currentIndex];
    answersRef.current.push({
      itemType: currentQ.itemType,
      itemId: currentQ.itemId,
      isCorrect: correct,
      prompt: currentQ.front,
      answer: opt,
      correctAnswer: currentQ.back,
      responseMs: Date.now() - questionShownAtRef.current,
    });
    // Add to 'Needs Practice' if wrong
    if (!correct) {
      addToNeedsPractice(currentQ);
    }

    // Move to next after delay
    const isLastQuestion = currentIndex + 1 >= questions.length;
    setTimeout(async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (currentSession?.user.id !== userId) {
        answerLockRef.current = false;
        return;
      }

      if (!isLastQuestion) {
        setSelectedOption(null);
        setIsCorrect(null);
        setCurrentIndex((prev) => prev + 1);
        generateOptions(questions, currentIndex + 1);
        questionShownAtRef.current = Date.now();
        answerLockRef.current = false;
      } else {
        // finished
        setIsSubmitting(true);
        const payload = toGradedAnswerPayload(answersRef.current);
        try {
          const result = await submitLearningAttemptWithQueue(supabase, {
            activityType: "practice_quiz",
            attemptKey: quizAttemptKey,
            answers: payload as unknown as OfflineJson,
            practiceListId: listId,
            expectedUserId: userId,
          });
          if (result.status === "failed") {
            console.error("Failed to record practice quiz", result.error);
          }
        } catch (error) {
          console.error("Failed to record practice quiz", error);
        } finally {
          setSelectedOption(null);
          setIsCorrect(null);
          setCurrentIndex((prev) => prev + 1);
          setIsSubmitting(false);
          answerLockRef.current = false;
        }
      }
    }, 1500);
  };

  const addToNeedsPractice = async (item: QuizItem) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    // 1. Find or create Needs Practice list. Reuse the in-flight promise so
    // multiple wrong answers cannot queue duplicate smart-list creations offline.
    let smartListId = needsPracticeListIdRef.current;
    let createdNeedsPracticeList = false;
    if (!smartListId) {
      let pending = needsPracticeListPromiseRef.current;
      if (!pending) {
        pending = (async () => {
          const { data: existingList } = await supabase
            .from("practice_lists")
            .select("id")
            .eq("user_id", user.id)
            .eq("is_smart_list", true)
            .single();
          if (existingList) return existingList.id;

          const result = await createPracticeListWithQueue(supabase, {
            title: "Needs Practice",
            isSmartList: true,
            sortOrder: 1,
            expectedUserId: user.id,
          });
          if (result.status !== "failed" && result.data) {
            createdNeedsPracticeList = true;
          }
          return result.status === "failed" || !result.data ? null : result.data.id;
        })();
        needsPracticeListPromiseRef.current = pending;
      }

      smartListId = await pending;
      needsPracticeListPromiseRef.current = null;
      if (smartListId) needsPracticeListIdRef.current = smartListId;
    }

    if (!smartListId) return;

    // 2. Add item to smart list if not already there
    // We need original item_id and item_type. We have to fetch it because our QuizItem merged them.
    const itemId = Number(item.itemId);
    if (Number.isInteger(itemId)) {
      const result = await addPracticeListItemWithQueue(supabase, {
        listId: smartListId,
        itemId,
        itemType: item.itemType,
        expectedUserId: user.id,
      });
      if (result.status === "failed") {
        console.error("Failed to save item to Needs Practice", result.error);
      } else {
        const pendingStudyItem: PracticeStudyItem = {
          ...item,
          listItemId: `pending:${item.itemType}:${itemId}`,
          itemId: String(itemId),
          masteryScore: item.masteryScore ?? 0,
          lastReviewed: item.lastReviewed ?? null,
        };
        void updateCache<PracticeStudyItem[]>(
          `practice-study:${user.id}:${smartListId}`,
          (current) =>
            current?.some(
              (cachedItem) =>
                cachedItem.itemType === item.itemType && cachedItem.itemId === String(itemId)
            )
              ? current
              : [...(current ?? []), pendingStudyItem]
        );
        void updateCache<PracticeList>(
          `practice-list:${user.id}:${smartListId}`,
          (current) =>
            current ?? {
              id: smartListId,
              title: "Needs Practice",
              is_smart_list: true,
              sort_order: 1,
              item_count: 1,
            }
        );
        void updateCache<PracticeList[]>(`practice-lists:${user.id}`, (current) => {
          const list = {
            id: smartListId,
            title: "Needs Practice",
            is_smart_list: true,
            sort_order: 1,
            item_count: 1,
          } as PracticeList;
          const existing = current?.some((cachedList) => cachedList.id === smartListId);
          if (!existing) return [list, ...(current ?? [])];
          if (!createdNeedsPracticeList) return current!;
          return current!.map((cachedList) =>
            cachedList.id === smartListId ? { ...cachedList, item_count: 1 } : cachedList
          );
        });
      }
    }
  };

  const renderFinished = () => (
    <View style={s.finishedBox}>
      <Text style={s.finishedEmoji}>{score === questions.length ? "🏆" : "👍"}</Text>
      <Text style={s.finishedTitle}>Quiz Complete!</Text>
      <Text style={s.finishedSub}>
        You scored {score} out of {questions.length}.
      </Text>

      <TouchableOpacity style={s.doneBtn} onPress={() => router.back()}>
        <Text style={s.doneBtnText}>Back to List</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.dark.textMuted} />
        </TouchableOpacity>
        <Text style={s.progressText}>
          {Math.min(currentIndex + 1, questions.length)} / {questions.length}
        </Text>
        <View style={s.scoreBadge}>
          <Text style={s.scoreBadgeText}>⭐ {score}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={s.progressWrap}>
        <LinearGradient
          colors={[Colors.accent[500], Colors.accent[400]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            s.progressFill,
            { width: `${questions.length ? (currentIndex / questions.length) * 100 : 0}%` as any },
          ]}
        />
      </View>

      {/* Main Area */}
      <View style={s.main}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.accent[400]} />
        ) : currentIndex >= questions.length ? (
          renderFinished()
        ) : (
          <View style={s.quizArea}>
            <View style={s.questionCard}>
              <Text style={s.questionText}>{questions[currentIndex]?.front}</Text>
              <TouchableOpacity
                style={s.audioBtn}
                accessibilityRole="button"
                accessibilityLabel="Play pronunciation"
                onPress={() =>
                  Speech.speak(questions[currentIndex]?.audioText || "", { language: "ja-JP" })
                }
              >
                <Ionicons name="volume-high" size={24} color={Colors.primary[400]} />
              </TouchableOpacity>
            </View>

            <View style={s.optionsGrid}>
              {options.map((opt, i) => {
                const isSelected = selectedOption === opt;
                const isCorrectAns = opt === questions[currentIndex].back;

                let btnStyle: StyleProp<ViewStyle> = s.optionBtn;
                let textStyle: StyleProp<TextStyle> = s.optionText;
                let icon = null;

                if (selectedOption) {
                  if (isCorrectAns) {
                    btnStyle = [s.optionBtn, s.optionCorrect];
                    textStyle = [s.optionText, s.textCorrect];
                    icon = (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#6EE7B7"
                        style={s.optIcon}
                      />
                    );
                  } else if (isSelected && !isCorrect) {
                    btnStyle = [s.optionBtn, s.optionWrong];
                    textStyle = [s.optionText, s.textWrong];
                    icon = (
                      <Ionicons name="close-circle" size={20} color="#FCA5A5" style={s.optIcon} />
                    );
                  } else {
                    btnStyle = [s.optionBtn, s.optionDisabled];
                  }
                }

                return (
                  <TouchableOpacity
                    key={i}
                    style={btnStyle}
                    activeOpacity={0.7}
                    disabled={selectedOption !== null}
                    onPress={() => handleSelect(opt)}
                  >
                    <Text style={textStyle}>{opt}</Text>
                    {icon}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  progressText: {
    color: Colors.dark.text,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  scoreBadge: {
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreBadgeText: {
    color: Colors.dark.text,
    fontWeight: "bold",
  },
  progressWrap: {
    height: 4,
    backgroundColor: Colors.dark.surface,
    width: "100%",
  },
  progressFill: {
    height: "100%",
  },
  main: {
    flex: 1,
    padding: Spacing.xl,
    paddingTop: Spacing["3xl"],
  },
  quizArea: {
    flex: 1,
    alignItems: "center",
  },
  questionCard: {
    width: "100%",
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius["3xl"],
    padding: Spacing["3xl"],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: Spacing["3xl"],
    minHeight: 200,
    shadowColor: Colors.primary[900],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  questionText: {
    fontSize: 64,
    fontWeight: FontWeight.black,
    color: Colors.dark.text,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  audioBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dark.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  optionsGrid: {
    width: "100%",
    gap: Spacing.md,
  },
  optionBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.surface,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: Colors.dark.border,
  },
  optionText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    flex: 1,
  },
  optIcon: {
    marginLeft: Spacing.sm,
  },
  optionCorrect: {
    backgroundColor: "#064E3B",
    borderColor: "#10B981",
  },
  textCorrect: {
    color: "#6EE7B7",
  },
  optionWrong: {
    backgroundColor: "#7F1D1D",
    borderColor: "#EF4444",
  },
  textWrong: {
    color: "#FCA5A5",
  },
  optionDisabled: {
    opacity: 0.5,
  },
  finishedBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
  },
  finishedEmoji: {
    fontSize: 72,
    marginBottom: Spacing.xl,
  },
  finishedTitle: {
    fontSize: 32,
    fontWeight: FontWeight.black,
    color: "#fff",
    marginBottom: Spacing.sm,
  },
  finishedSub: {
    fontSize: FontSize.lg,
    color: Colors.dark.textMuted,
    marginBottom: Spacing["3xl"],
  },
  doneBtn: {
    backgroundColor: Colors.accent[500],
    paddingHorizontal: Spacing["3xl"],
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    width: "100%",
    alignItems: "center",
  },
  doneBtnText: {
    color: "#fff",
    fontWeight: FontWeight.bold,
    fontSize: FontSize.xl,
  },
});
