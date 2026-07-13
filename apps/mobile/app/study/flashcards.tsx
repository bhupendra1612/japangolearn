import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Speech from "expo-speech";
import { supabase } from "@/lib/supabase";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type FlashcardItem = {
  id: string; // practice_list_items id
  front: string; // kanji or character
  back: string; // romaji/meaning
  audioText: string;
  mastery_score: number;
};

export default function FlashcardsScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  // Animations
  const flipAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (listId) loadCards();
  }, [listId]);

  const loadCards = async () => {
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
            back: `${v?.hiragana ? v.hiragana + "\n" : ""}${v?.english || ""}`,
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

      // Shuffle cards for practice
      setCards(mergedCards.sort(() => Math.random() - 0.5));
    }
    setLoading(false);
  };

  const flipCard = () => {
    if (isFlipped) {
      Animated.timing(flipAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(flipAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      // Speak the back of the card when revealed
      if (cards[currentIndex]?.audioText) {
        Speech.speak(cards[currentIndex].audioText, { language: "ja-JP" });
      }
    }
    setIsFlipped(!isFlipped);
  };

  const handleScore = async (performance: "again" | "hard" | "good" | "easy") => {
    // 1. Calculate new mastery
    const currentCard = cards[currentIndex];
    let scoreChange = 0;
    switch (performance) {
      case "again":
        scoreChange = -20;
        break;
      case "hard":
        scoreChange = 5;
        break;
      case "good":
        scoreChange = 15;
        break;
      case "easy":
        scoreChange = 25;
        break;
    }

    const newScore = Math.min(100, Math.max(0, currentCard.mastery_score + scoreChange));

    // 2. Update DB
    supabase
      .from("practice_list_items")
      .update({ mastery_score: newScore, last_reviewed: new Date().toISOString() })
      .eq("id", currentCard.id)
      .then();

    // 3. Update streak logic (simple check: mark today as practiced)
    supabase.rpc("increment_streak").then();

    // 4. Next card animation
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -SCREEN_W, duration: 250, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      // Reset card position and move to next
      setIsFlipped(false);
      flipAnim.setValue(0);
      slideAnim.setValue(SCREEN_W);
      setCurrentIndex((prev) => prev + 1);

      // Slide in next card
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  };

  // Interpolate rotations
  const frontRotateY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backRotateY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const renderFinished = () => (
    <View style={s.finishedBox}>
      <Text style={s.finishedEmoji}>🎉</Text>
      <Text style={s.finishedTitle}>Session Complete!</Text>
      <Text style={s.finishedSub}>You reviewed {cards.length} cards today.</Text>
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
          {Math.min(currentIndex + 1, cards.length)} / {cards.length}
        </Text>
        <View style={s.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={s.progressWrap}>
        <LinearGradient
          colors={[Colors.primary[500], Colors.accent[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            s.progressFill,
            { width: `${cards.length ? (currentIndex / cards.length) * 100 : 0}%` as any },
          ]}
        />
      </View>

      {/* Main Area */}
      <View style={s.main}>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary[400]} />
        ) : currentIndex >= cards.length ? (
          renderFinished()
        ) : (
          <View style={s.cardWrapper}>
            <TouchableOpacity activeOpacity={1} onPress={flipCard} style={s.cardTouchable}>
              <Animated.View
                style={[s.cardOuter, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}
              >
                {/* FRONT */}
                <Animated.View
                  style={[s.cardSide, s.cardFront, { transform: [{ rotateY: frontRotateY }] }]}
                >
                  <Text style={s.cardFrontText}>{cards[currentIndex]?.front}</Text>
                  <Text style={s.flipHint}>Tap to reveal</Text>
                </Animated.View>

                {/* BACK */}
                <Animated.View
                  style={[s.cardSide, s.cardBack, { transform: [{ rotateY: backRotateY }] }]}
                >
                  <View style={s.cardBackContent}>
                    <Text style={s.cardBackContext}>{cards[currentIndex]?.front}</Text>
                    <View style={s.divider} />
                    <Text style={s.cardBackText}>{cards[currentIndex]?.back}</Text>
                  </View>
                </Animated.View>
              </Animated.View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom Actions */}
      {!loading && currentIndex < cards.length && isFlipped && (
        <View style={s.actionRow}>
          <TouchableOpacity
            style={[s.scoreBtn, { backgroundColor: "#EF444420", borderColor: "#EF4444" }]}
            onPress={() => handleScore("again")}
          >
            <Text style={[s.scoreText, { color: "#FCA5A5" }]}>Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.scoreBtn, { backgroundColor: "#F59E0B20", borderColor: "#F59E0B" }]}
            onPress={() => handleScore("hard")}
          >
            <Text style={[s.scoreText, { color: "#FCD34D" }]}>Hard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.scoreBtn, { backgroundColor: "#10B98120", borderColor: "#10B981" }]}
            onPress={() => handleScore("good")}
          >
            <Text style={[s.scoreText, { color: "#6EE7B7" }]}>Good</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.scoreBtn, { backgroundColor: "#3B82F620", borderColor: "#3B82F6" }]}
            onPress={() => handleScore("easy")}
          >
            <Text style={[s.scoreText, { color: "#93C5FD" }]}>Easy</Text>
          </TouchableOpacity>
        </View>
      )}
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
  placeholder: {
    width: 32,
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
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  cardWrapper: {
    width: "100%",
    height: SCREEN_H * 0.55,
    transform: [{ perspective: 1000 }],
  },
  cardTouchable: {
    width: "100%",
    height: "100%",
  },
  cardOuter: {
    width: "100%",
    height: "100%",
  },
  cardSide: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: BorderRadius["3xl"],
    backfaceVisibility: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    shadowColor: Colors.primary[900],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  cardFront: {
    backgroundColor: Colors.dark.card,
    borderColor: Colors.dark.border,
  },
  cardBack: {
    backgroundColor: Colors.primary[900] + "30",
    borderColor: Colors.primary[700],
  },
  cardFrontText: {
    fontSize: 64,
    fontWeight: FontWeight.black,
    color: Colors.dark.text,
    textAlign: "center",
  },
  flipHint: {
    position: "absolute",
    bottom: Spacing.xl,
    color: Colors.dark.textMuted,
    fontSize: FontSize.sm,
  },
  cardBackContent: {
    padding: Spacing["2xl"],
    alignItems: "center",
    width: "100%",
  },
  cardBackContext: {
    fontSize: FontSize["2xl"],
    color: Colors.dark.textMuted,
    marginBottom: Spacing.lg,
  },
  divider: {
    width: 40,
    height: 4,
    backgroundColor: Colors.primary[500],
    borderRadius: 2,
    marginBottom: Spacing.xl,
  },
  cardBackText: {
    fontSize: FontSize["2xl"],
    color: "#fff",
    fontWeight: FontWeight.bold,
    textAlign: "center",
    lineHeight: 36,
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing["2xl"],
    gap: Spacing.sm,
  },
  scoreBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    borderWidth: 1,
  },
  scoreText: {
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
  finishedBox: {
    alignItems: "center",
    padding: Spacing["2xl"],
  },
  finishedEmoji: {
    fontSize: 64,
    marginBottom: Spacing.xl,
  },
  finishedTitle: {
    fontSize: FontSize["2xl"],
    fontWeight: FontWeight.bold,
    color: "#fff",
    marginBottom: Spacing.sm,
  },
  finishedSub: {
    fontSize: FontSize.base,
    color: Colors.dark.textMuted,
    marginBottom: Spacing["2xl"],
  },
  doneBtn: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing["2xl"],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  doneBtnText: {
    color: "#fff",
    fontWeight: FontWeight.bold,
    fontSize: FontSize.lg,
  },
});
