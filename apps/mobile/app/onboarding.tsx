import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/lib/auth";
import { Colors, BorderRadius } from "@/constants/theme";

const { width, height } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    emoji: "🇯🇵",
    title: "Learn Japanese\nthe Smart Way",
    subtitle:
      "Master hiragana, katakana, vocabulary, grammar, and writing with guided lessons and quizzes.",
    gradient: ["#6C3DD4", "#4318A8"],
    accent: "#A78BFA",
  },
  {
    id: "2",
    emoji: "📚",
    title: "900+ Free N5\nVocabulary Words",
    subtitle:
      "Browse all JLPT N5 words organized by category — no signup required. Start learning immediately.",
    gradient: ["#1E6B4A", "#0F4D33"],
    accent: "#34D399",
  },
  {
    id: "3",
    emoji: "🎯",
    title: "Build a Daily\nStudy Habit",
    subtitle:
      "Practice with quizzes, custom lists, speech playback, XP, streaks, and progress tracking.",
    gradient: ["#B45309", "#92400E"],
    accent: "#FCD34D",
  },
];

export default function OnboardingScreen() {
  const { continueAsGuest } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleGuestMode = async () => {
    await continueAsGuest();
    router.replace("/(tabs)");
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    }
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => (
          <LinearGradient
            colors={item.gradient as [string, string]}
            style={styles.slide}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Decorative circles */}
            <View style={[styles.circle1, { backgroundColor: item.accent + "20" }]} />
            <View style={[styles.circle2, { backgroundColor: item.accent + "15" }]} />

            <View style={styles.slideContent}>
              <View
                style={[
                  styles.emojiContainer,
                  { backgroundColor: item.accent + "25", borderColor: item.accent + "40" },
                ]}
              >
                <Text style={styles.emoji}>{item.emoji}</Text>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </LinearGradient>
        )}
        keyExtractor={(item) => item.id}
      />

      {/* Bottom controls */}
      <View style={styles.controls}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: "clamp",
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.4, 1, 0.4],
              extrapolate: "clamp",
            });
            return <Animated.View key={i} style={[styles.dot, { width: dotWidth, opacity }]} />;
          })}
        </View>

        {isLast ? (
          <View style={styles.ctaButtons}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push("/(auth)/signup")}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#7C3AED", "#5B21B6"]}
                style={styles.primaryBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.primaryBtnText}>✨ Create Free Account</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push("/(auth)/login")}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>Already have an account? Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.guestBtn} onPress={handleGuestMode} activeOpacity={0.7}>
              <Text style={styles.guestBtnText}>Continue without account →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.navButtons}>
            <TouchableOpacity style={styles.skipBtn} onPress={handleGuestMode} activeOpacity={0.7}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
              <LinearGradient
                colors={["#7C3AED", "#5B21B6"]}
                style={styles.nextBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.nextBtnText}>Next →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  slide: { width, height, justifyContent: "center" },
  slideContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 160,
  },
  circle1: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -80,
    right: -80,
  },
  circle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: 100,
    left: -60,
  },
  emojiContainer: {
    width: 120,
    height: 120,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    borderWidth: 2,
  },
  emoji: { fontSize: 60 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    lineHeight: 42,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 24,
  },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.dark.bg,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  dots: { flexDirection: "row", justifyContent: "center", marginBottom: 24, gap: 6 },
  dot: { height: 8, borderRadius: 4, backgroundColor: Colors.primary[400] },
  ctaButtons: { gap: 12 },
  primaryBtn: { borderRadius: BorderRadius.xl, overflow: "hidden" },
  primaryBtnGradient: { paddingVertical: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  secondaryBtn: {
    borderRadius: BorderRadius.xl,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
  },
  secondaryBtnText: { color: Colors.dark.text, fontSize: 15, fontWeight: "600" },
  guestBtn: { paddingVertical: 12, alignItems: "center" },
  guestBtnText: { color: Colors.dark.textMuted, fontSize: 14 },
  navButtons: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  skipBtn: { paddingVertical: 14, paddingHorizontal: 8 },
  skipText: { color: Colors.dark.textMuted, fontSize: 16 },
  nextBtn: { borderRadius: BorderRadius.xl, overflow: "hidden" },
  nextBtnGradient: { paddingVertical: 14, paddingHorizontal: 32 },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
