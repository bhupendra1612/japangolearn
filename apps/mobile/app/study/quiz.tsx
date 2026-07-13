import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import { StyleProp } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import { supabase } from "@/lib/supabase";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";

type QuizItem = {
  id: string;
  front: string; // kanji/kana
  back: string; // meaning/romaji
  audioText: string;
  mastery_score: number;
};

export default function QuizScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [questions, setQuestions] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (listId) loadQuiz();
  }, [listId]);

  const loadQuiz = async () => {
    setLoading(true);
    const { data: listItems } = await supabase
      .from("practice_list_items")
      .select("*")
      .eq("list_id", listId);

    if (listItems && listItems.length > 0) {
      const vocabIds = listItems.filter((i) => i.item_type === "vocabulary").map((i) => i.item_id);
      const kanaIds = listItems.filter((i) => i.item_type === "kana").map((i) => i.item_id);

      let vocabMap = new Map();
      let kanaMap = new Map();

      if (vocabIds.length > 0) {
        const { data: vocabData } = await supabase
          .from("vocabulary")
          .select("*")
          .in("id", vocabIds);
        vocabData?.forEach((v) => vocabMap.set(v.id, v));
      }
      if (kanaIds.length > 0) {
        const { data: kanaData } = await supabase.from("kana").select("*").in("id", kanaIds);
        kanaData?.forEach((k) => kanaMap.set(k.id, k));
      }

      const mergedCards = listItems.map((item) => {
        if (item.item_type === "vocabulary") {
          const v = vocabMap.get(item.item_id);
          return {
            id: item.id,
            front: v?.kanji || v?.hiragana || "",
            back: v?.english || "",
            audioText: v?.kanji || v?.hiragana || "",
            mastery_score: item.mastery_score,
          };
        } else {
          const k = kanaMap.get(item.item_id);
          return {
            id: item.id,
            front: k?.character || "",
            back: k?.romaji || "",
            audioText: k?.character || "",
            mastery_score: item.mastery_score,
          };
        }
      });

      const shuffled = mergedCards.sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
      generateOptions(shuffled, 0);
    }
    setLoading(false);
  };

  const generateOptions = (allQs: QuizItem[], correctIdx: number) => {
    if (!allQs || allQs.length === 0) return;
    const correctAns = allQs[correctIdx].back;

    // Get 3 random wrong answers
    const wrongAnswers = allQs
      .filter((_, idx) => idx !== correctIdx)
      .map((q) => q.back)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    // If not enough wrong answers in the same list, add placeholders (edge case for small lists)
    while (wrongAnswers.length < 3) {
      wrongAnswers.push(`Option ${wrongAnswers.length + 1}`);
    }

    const newOptions = [correctAns, ...wrongAnswers].sort(() => Math.random() - 0.5);
    setOptions(newOptions);
  };

  const handleSelect = async (opt: string) => {
    if (selectedOption !== null) return; // Prevent multiple taps

    setSelectedOption(opt);
    const correctAns = questions[currentIndex].back;
    const correct = opt === correctAns;
    setIsCorrect(correct);

    if (correct) {
      setScore((s) => s + 1);
      Speech.speak("Correct", { language: "en-US" }); // optional sound feedback
    }

    // Update Mastery in DB
    const currentQ = questions[currentIndex];
    const scoreChange = correct ? 15 : -10;
    const newScore = Math.min(100, Math.max(0, currentQ.mastery_score + scoreChange));

    supabase
      .from("practice_list_items")
      .update({ mastery_score: newScore, last_reviewed: new Date().toISOString() })
      .eq("id", currentQ.id)
      .then();

    // Add to 'Needs Practice' if wrong
    if (!correct) {
      addToNeedsPractice(currentQ);
    }

    // Increment streak
    supabase.rpc("increment_streak").then();

    // Move to next after delay
    setTimeout(() => {
      setSelectedOption(null);
      setIsCorrect(null);
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
        generateOptions(questions, currentIndex + 1);
      } else {
        // finished
        const finalScore = score + (correct ? 1 : 0);
        const xpEarned = finalScore * 10;
        if (xpEarned > 0) {
          supabase
            .rpc("award_xp", {
              p_type: "practice",
              p_title: "Custom List Practice",
              p_description: "Completed list practice quiz",
              p_amount: xpEarned,
            })
            .then();
        }
        setCurrentIndex((prev) => prev + 1);
      }
    }, 1500);
  };

  const addToNeedsPractice = async (item: QuizItem) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Find or create Needs Practice list
    let { data: smartList } = await supabase
      .from("practice_lists")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_smart_list", true)
      .single();

    if (!smartList) {
      const { data: newList } = await supabase
        .from("practice_lists")
        .insert({ user_id: user.id, title: "Needs Practice", is_smart_list: true })
        .select()
        .single();
      smartList = newList;
    }

    if (!smartList) return;

    // 2. Add item to smart list if not already there
    // We need original item_id and item_type. We have to fetch it because our QuizItem merged them.
    const { data: originalItem } = await supabase
      .from("practice_list_items")
      .select("item_id, item_type")
      .eq("id", item.id)
      .single();

    if (originalItem) {
      // Check if exists
      const { data: existing } = await supabase
        .from("practice_list_items")
        .select("id")
        .eq("list_id", smartList.id)
        .eq("item_id", originalItem.item_id)
        .eq("item_type", originalItem.item_type)
        .single();

      if (!existing) {
        await supabase.from("practice_list_items").insert({
          list_id: smartList.id,
          item_id: originalItem.item_id,
          item_type: originalItem.item_type,
          mastery_score: 0,
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
