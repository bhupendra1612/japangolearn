import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  Pressable,
  Image,
  PanResponder,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import { AuthPromptModal } from "@/components/AuthPromptModal";

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.75;

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

const NAV_ITEMS = [
  { icon: "home-outline" as const, label: "Dashboard", route: "/(tabs)/", free: true },
  {
    icon: "book-outline" as const,
    label: "Vocabulary N5",
    route: "/(tabs)/vocabulary",
    free: true,
  },
  { icon: "text-outline" as const, label: "Kanji N5", route: "/(tabs)/kanji", free: true },
  { icon: "school-outline" as const, label: "Grammar", route: "/(tabs)/grammar", free: true },
  {
    icon: "pencil-outline" as const,
    label: "Writing Practice",
    route: "/(tabs)/writing",
    free: true,
  },
  {
    icon: "chatbubble-ellipses-outline" as const,
    label: "AI Conversation",
    route: "/(tabs)/ai",
    free: false,
    comingSoon: true,
  },
  {
    icon: "trophy-outline" as const,
    label: "Achievements",
    route: "/(tabs)/achievements",
    free: false,
  },
];

const SETTING_ITEMS = [
  { icon: "person-circle-outline" as const, label: "Profile", route: "/(tabs)/profile" },
  { icon: "settings-outline" as const, label: "Settings", route: "/(tabs)/profile" },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { session, profile, isGuest, signOut, exitGuestMode } = useAuth();
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [lockedFeature, setLockedFeature] = useState<{ label: string; route: string } | null>(null);

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: isOpen ? 0 : -SIDEBAR_WIDTH,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(overlayAnim, {
        toValue: isOpen ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen, overlayAnim, slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond if swipe is strongly moving leftwards
        return gestureState.dx < -10 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -50) {
          onClose();
        }
      },
    })
  ).current;

  const handleNav = (route: string, free: boolean, label: string, comingSoon = false) => {
    if (comingSoon) {
      onClose();
      Alert.alert(
        "Planned feature",
        `${label} is not available in this release. It will be enabled only after the feature is complete.`
      );
      return;
    }

    if (!free && !session) {
      onClose();
      setLockedFeature({ label, route });
      return;
    }

    onClose();
    router.push(route as any);
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
    router.replace("/onboarding");
  };

  const handleLogin = () => {
    onClose();
    if (isGuest) exitGuestMode();
    router.replace("/(auth)/login");
  };

  if (!isOpen && !lockedFeature) return null;

  return (
    <>
      {isOpen && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Overlay */}
          <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>

          {/* Sidebar panel */}
          <Animated.View
            style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}
            {...panResponder.panHandlers}
          >
            <LinearGradient colors={["#1A1035", "#0F0B1E"]} style={StyleSheet.absoluteFill} />

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.logoRow}>
                  <View style={styles.logoBox}>
                    <Text style={styles.logoEmoji}>🇯🇵</Text>
                  </View>
                  <View>
                    <Text style={styles.appName}>EasyJapanese</Text>
                    <Text style={styles.appTagline}>学ぼう日本語</Text>
                  </View>
                </View>

                {/* User info */}
                <View style={styles.userCard}>
                  {session ? (
                    <>
                      {profile?.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                      ) : (
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {(profile?.display_name || "U")[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{profile?.display_name || "User"}</Text>
                        <Text style={styles.userLevel}>
                          JLPT {profile?.current_jlpt_level || "N5"} · {profile?.xp || 0} XP
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={[styles.avatar, { backgroundColor: Colors.dark.border }]}>
                        <Ionicons name="person" size={20} color={Colors.dark.textMuted} />
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>Guest User</Text>
                        <TouchableOpacity onPress={handleLogin}>
                          <Text style={styles.signInPrompt}>Sign in to save progress →</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </View>

              {/* Navigation */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>LEARN</Text>
                {NAV_ITEMS.map((item) => (
                  <TouchableOpacity
                    key={item.route}
                    style={styles.navItem}
                    onPress={() =>
                      handleNav(
                        item.route,
                        item.free,
                        item.label,
                        "comingSoon" in item && item.comingSoon
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <View style={styles.navIconWrap}>
                      <Ionicons name={item.icon} size={20} color={Colors.primary[400]} />
                    </View>
                    <Text style={styles.navLabel}>{item.label}</Text>
                    {"comingSoon" in item && item.comingSoon ? (
                      <View style={styles.soonBadge}>
                        <Text style={styles.soonText}>PLANNED</Text>
                      </View>
                    ) : (
                      !item.free &&
                      !session && (
                        <View style={styles.lockBadge}>
                          <Ionicons name="lock-closed" size={12} color={Colors.primary[300]} />
                        </View>
                      )
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ACCOUNT</Text>
                {SETTING_ITEMS.map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={styles.navItem}
                    onPress={() => handleNav(item.route, !!session, item.label)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.navIconWrap}>
                      <Ionicons name={item.icon} size={20} color={Colors.dark.textSecondary} />
                    </View>
                    <Text style={styles.navLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sign out / Sign in */}
              <View style={styles.footer}>
                {session ? (
                  <TouchableOpacity
                    style={styles.signOutBtn}
                    onPress={handleSignOut}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                    <Text style={styles.signOutText}>Sign Out</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.signInBtn}
                    onPress={handleLogin}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={["#7C3AED", "#5B21B6"]}
                      style={styles.signInBtnGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="person-outline" size={18} color="#fff" />
                      <Text style={styles.signInBtnText}>Sign In / Create Account</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                <Text style={styles.version}>EasyJapanese v1.0</Text>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      )}

      <AuthPromptModal
        visible={!!lockedFeature}
        feature={lockedFeature?.label ?? "this feature"}
        redirectTo={lockedFeature?.route ?? "/(tabs)"}
        onClose={() => setLockedFeature(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    overflow: "hidden",
    zIndex: 100,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary[700],
    justifyContent: "center",
    alignItems: "center",
  },
  logoEmoji: { fontSize: 24 },
  appName: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.dark.text },
  appTagline: { fontSize: FontSize.xs, color: Colors.dark.textMuted, marginTop: 2 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[700],
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: { color: "#fff", fontWeight: FontWeight.bold, fontSize: FontSize.base },
  userInfo: { flex: 1 },
  userName: { color: Colors.dark.text, fontWeight: FontWeight.semibold, fontSize: FontSize.sm },
  userLevel: { color: Colors.dark.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  signInPrompt: { color: Colors.primary[400], fontSize: FontSize.xs, marginTop: 2 },
  section: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  sectionTitle: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: Colors.dark.textMuted,
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: 2,
  },
  navIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(124,58,237,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  navLabel: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  lockBadge: {
    backgroundColor: "rgba(124,58,237,0.2)",
    borderRadius: 8,
    padding: 4,
  },
  soonBadge: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  soonText: {
    color: Colors.gold[400],
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.dark.border,
    marginHorizontal: Spacing.xl,
    marginVertical: Spacing.sm,
  },
  footer: { padding: Spacing.xl, gap: Spacing.md, marginTop: Spacing.md },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  signOutText: { color: "#EF4444", fontWeight: FontWeight.medium, fontSize: FontSize.sm },
  signInBtn: { borderRadius: BorderRadius.lg, overflow: "hidden" },
  signInBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    justifyContent: "center",
  },
  signInBtnText: { color: "#fff", fontWeight: FontWeight.bold, fontSize: FontSize.sm },
  version: { textAlign: "center", color: Colors.dark.textMuted, fontSize: 11 },
});
