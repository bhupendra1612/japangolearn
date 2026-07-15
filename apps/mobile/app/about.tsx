import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";

export default function AboutScreen() {
  const insets = useSafeAreaInsets();

  const handleContact = () => {
    Linking.openURL("tel:+917822989933");
  };

  const handleWhatsApp = () => {
    Linking.openURL("whatsapp://send?phone=+917822989933");
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
          <Text style={s.appName}>EasyJapanese</Text>
          <Text style={s.versionText}>Version 1.0.0</Text>
        </View>

        <View style={s.card}>
          <View style={s.badgeRow}>
            <View style={s.badge}>
              <Text style={s.badgeText}>Developed By</Text>
            </View>
          </View>
          <Text style={s.companyName}>Trading Tech</Text>
          <Text style={s.companyDesc}>
            We are focused on building next-generation technology, automation tools, and modern
            software platforms. From robust algorithmic trading systems to scalable apps, we bridge
            the gap between complex ideas and seamless execution. 🚀
          </Text>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Our Services</Text>
          <View style={s.serviceList}>
            <View style={s.serviceItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary[400]} />
              <Text style={s.serviceText}>Automated Trading Systems & Bots</Text>
            </View>
            <View style={s.serviceItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary[400]} />
              <Text style={s.serviceText}>FinTech Software & SaaS Development</Text>
            </View>
            <View style={s.serviceItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary[400]} />
              <Text style={s.serviceText}>Custom Web & Mobile Apps</Text>
            </View>
            <View style={s.serviceItem}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary[400]} />
              <Text style={s.serviceText}>Learning Platforms & Educational Apps</Text>
            </View>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Get In Touch</Text>
          <Text style={s.contactDesc}>
            Interested in working with us or need support? Reach out directly!
          </Text>

          <TouchableOpacity style={s.contactBtn} onPress={handleWhatsApp} activeOpacity={0.8}>
            <View style={[s.iconBox, { backgroundColor: "#25D36620" }]}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            </View>
            <Text style={s.contactBtnText}>WhatsApp Us</Text>
            <Ionicons name="open-outline" size={16} color={Colors.dark.textMuted} />
          </TouchableOpacity>

          <View style={s.divider} />

          <TouchableOpacity style={s.contactBtn} onPress={handleContact} activeOpacity={0.8}>
            <View style={[s.iconBox, { backgroundColor: Colors.primary[500] + "20" }]}>
              <Ionicons name="call" size={20} color={Colors.primary[400]} />
            </View>
            <Text style={s.contactBtnText}>Call: +91 7822989933</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.copyright}>© 2026 Trading Tech. All rights reserved.</Text>
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
  badgeRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  badge: {
    backgroundColor: Colors.primary[600] + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primary[500] + "40",
  },
  badgeText: {
    color: Colors.primary[400],
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  companyName: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  companyDesc: {
    fontSize: FontSize.base,
    color: Colors.dark.textSecondary,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "bold",
    color: Colors.dark.text,
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
  },
  serviceList: {
    gap: Spacing.sm,
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  serviceText: {
    fontSize: FontSize.sm,
    color: Colors.dark.textSecondary,
  },
  contactDesc: {
    fontSize: FontSize.sm,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  contactBtn: {
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
  contactBtnText: {
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
