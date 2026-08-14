import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import {
  DELETE_ACCOUNT_URL,
  PRIVACY_URL,
  SITE_URL,
  SUPPORT_EMAIL,
  TERMS_URL,
} from "@/constants/links";

const LEGAL_LINKS = [
  {
    icon: "shield-checkmark-outline" as const,
    label: "Privacy Policy",
    url: PRIVACY_URL,
  },
  {
    icon: "document-text-outline" as const,
    label: "Terms & Conditions",
    url: TERMS_URL,
  },
  {
    icon: "trash-outline" as const,
    label: "Delete Your Account",
    url: DELETE_ACCOUNT_URL,
  },
];

export default function AboutScreen() {
  const insets = useSafeAreaInsets();

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      // Nothing to recover from here — the user can reach the same pages on the website.
    });
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={26} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>About</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* App Hero Section */}
        <View style={s.heroSection}>
          <LinearGradient colors={[Colors.primary[600], Colors.primary[800]]} style={s.logoWrapper}>
            <Text style={s.logoEmoji}>🇯🇵</Text>
          </LinearGradient>
          <Text style={s.appName}>JapanGoLearn</Text>
          <Text style={s.versionText}>Version 1.0.0</Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>About the App</Text>
          <Text style={s.bodyText}>
            JapanGoLearn helps you build real Japanese ability step by step — hiragana and katakana,
            kanji with stroke practice, vocabulary, grammar patterns, and quizzes that adapt as you
            improve. Track your progress with XP, daily streaks, and achievements from N5 upward.
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>What You Can Learn</Text>
          <View style={s.featureList}>
            {[
              "Hiragana & Katakana with stroke-by-stroke writing",
              "Kanji readings, meanings, and practice",
              "Vocabulary organised by JLPT level and topic",
              "Grammar patterns with example sentences",
              "Quizzes, flashcards, and custom practice lists",
            ].map((item) => (
              <View key={item} style={s.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.primary[400]} />
                <Text style={s.featureText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Support</Text>
          <Text style={s.contactDesc}>
            Questions, feedback, or a problem with your account? We&apos;re happy to help.
          </Text>

          <TouchableOpacity
            style={s.linkRow}
            onPress={() => openUrl(`mailto:${SUPPORT_EMAIL}`)}
            activeOpacity={0.8}
          >
            <View style={[s.iconBox, { backgroundColor: Colors.primary[500] + "20" }]}>
              <Ionicons name="mail" size={20} color={Colors.primary[400]} />
            </View>
            <Text style={s.linkRowText}>{SUPPORT_EMAIL}</Text>
            <Ionicons name="open-outline" size={16} color={Colors.dark.textMuted} />
          </TouchableOpacity>

          <View style={s.divider} />

          <TouchableOpacity style={s.linkRow} onPress={() => openUrl(SITE_URL)} activeOpacity={0.8}>
            <View style={[s.iconBox, { backgroundColor: Colors.accent[500] + "20" }]}>
              <Ionicons name="globe-outline" size={20} color={Colors.accent[400]} />
            </View>
            <Text style={s.linkRowText}>japangolearn.com</Text>
            <Ionicons name="open-outline" size={16} color={Colors.dark.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Legal</Text>
          {LEGAL_LINKS.map((link, i, arr) => (
            <React.Fragment key={link.label}>
              <TouchableOpacity
                style={s.linkRow}
                onPress={() => openUrl(link.url)}
                activeOpacity={0.8}
              >
                <View style={[s.iconBox, { backgroundColor: Colors.dark.surface }]}>
                  <Ionicons name={link.icon} size={20} color={Colors.dark.textSecondary} />
                </View>
                <Text style={s.linkRowText}>{link.label}</Text>
                <Ionicons name="open-outline" size={16} color={Colors.dark.textMuted} />
              </TouchableOpacity>
              {i < arr.length - 1 && <View style={s.divider} />}
            </React.Fragment>
          ))}
        </View>

        <Text style={s.copyright}>© 2026 JapanGoLearn. All rights reserved.</Text>
      </ScrollView>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 60,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
    marginTop: Spacing.xl,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoEmoji: {
    fontSize: 40,
  },
  appName: {
    fontSize: FontSize["2xl"],
    fontWeight: "900",
    color: Colors.dark.text,
    letterSpacing: 0.5,
  },
  versionText: {
    fontSize: FontSize.sm,
    color: Colors.dark.textMuted,
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "bold",
    color: Colors.dark.text,
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
  },
  bodyText: {
    fontSize: FontSize.base,
    color: Colors.dark.textSecondary,
    lineHeight: 24,
  },
  featureList: {
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  featureText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.dark.textSecondary,
  },
  contactDesc: {
    fontSize: FontSize.sm,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  linkRowText: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.dark.text,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginVertical: Spacing.md,
  },
  copyright: {
    textAlign: "center",
    fontSize: FontSize.xs,
    color: Colors.dark.textMuted,
    marginTop: Spacing.xl,
  },
});
