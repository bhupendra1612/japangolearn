import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/lib/auth";
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";

type AuthPromptModalProps = {
  visible: boolean;
  feature: string;
  redirectTo: string;
  onClose: () => void;
  description?: string;
};

export function AuthPromptModal({
  visible,
  feature,
  redirectTo,
  onClose,
  description,
}: AuthPromptModalProps) {
  const { isGuest, exitGuestMode } = useAuth();

  const continueTo = (pathname: "/(auth)/login" | "/(auth)/signup") => {
    if (isGuest) {
      exitGuestMode();
    }
    onClose();
    router.push({ pathname, params: { redirectTo } } as never);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay} accessibilityViewIsModal>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <LinearGradient
            colors={[Colors.primary[700], Colors.primary[900]]}
            style={styles.iconWrap}
          >
            <Ionicons name="lock-closed" size={28} color="#fff" />
          </LinearGradient>

          <Text style={styles.eyebrow}>ACCOUNT REQUIRED</Text>
          <Text style={styles.title}>Sign in to use {feature}</Text>
          <Text style={styles.description}>
            {description ?? "Create a free account or sign in to save your learning progress."}
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => continueTo("/(auth)/login")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[Colors.primary[500], Colors.primary[700]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryGradient}
            >
              <Ionicons name="log-in-outline" size={19} color="#fff" />
              <Text style={styles.primaryText}>Sign In</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => continueTo("/(auth)/signup")}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryText}>Create Free Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Continue as guest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing["2xl"],
    backgroundColor: "rgba(5,3,15,0.82)",
  },
  card: {
    alignItems: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius["2xl"],
    borderWidth: 1,
    borderColor: Colors.dark.borderLight,
    backgroundColor: Colors.dark.card,
  },
  iconWrap: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    color: Colors.primary[300],
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.3,
    marginBottom: Spacing.sm,
  },
  title: {
    color: Colors.dark.text,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    textAlign: "center",
  },
  description: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 20,
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  primaryButton: {
    width: "100%",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  primaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  primaryText: {
    color: "#fff",
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  secondaryButton: {
    width: "100%",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary[600],
    marginTop: Spacing.md,
  },
  secondaryText: {
    color: Colors.primary[300],
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  cancelButton: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  cancelText: {
    color: Colors.dark.textMuted,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
