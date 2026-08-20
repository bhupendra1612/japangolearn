import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Linking,
  Image,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/lib/auth";
import { getSafeRedirectTo, setPendingRedirect } from "@/lib/auth-navigation";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import { PRIVACY_URL, TERMS_URL } from "@/constants/links";
import { DEFAULT_JLPT_LEVEL, JLPT_SIGNUP_LEVELS } from "@/constants/jlpt";

export default function SignupScreen() {
  const { signUp, verifySignupOtp, resendSignupOtp } = useAuth();
  const params = useLocalSearchParams<{ redirectTo?: string | string[] }>();
  const redirectTo = getSafeRedirectTo(params.redirectTo);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [jlptLevel, setJlptLevel] = useState<string>(DEFAULT_JLPT_LEVEL);
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      // The same pages are reachable on the website; nothing to recover here.
    });
  };

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Cooldown between "resend code" taps.
  React.useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const selectedLevel =
    JLPT_SIGNUP_LEVELS.find((l) => l.value === jlptLevel) ?? JLPT_SIGNUP_LEVELS[0];

  const handleSignup = async () => {
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    const { error: err, hasSession, resumedSignup } = await signUp(
      email,
      password,
      name,
      jlptLevel
    );
    if (err) {
      setLoading(false);
      setError(err.message);
      return;
    }
    if (!hasSession) {
      // Email confirmation is on: Supabase mailed a 6-digit code. Collect it
      // here rather than sending the user out to their inbox and back.
      setLoading(false);
      setAwaitingOtp(true);
      setMessage(
        resumedSignup
          ? `This email was already registered but never verified. We sent a new code to ${email.trim()}.`
          : `We sent a 6-digit code to ${email.trim()}.`
      );
      return;
    }
    // See login.tsx: app/index.tsx owns the post-auth navigation.
    setPendingRedirect(redirectTo);
    router.replace("/");
  };

  const handleVerifyOtp = async () => {
    const code = otp.replace(/\D/g, "");
    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    setLoading(true);
    setError("");
    const { error: err } = await verifySignupOtp(email, code);
    if (err) {
      setLoading(false);
      setError(err.message || "That code is not valid. Check it and try again.");
      return;
    }
    setPendingRedirect(redirectTo);
    router.replace("/");
  };

  const handleResendOtp = async () => {
    if (resendIn > 0) return;
    setError("");
    setMessage("");
    const { error: err } = await resendSignupOtp(email);
    if (err) {
      setError(err.message || "Could not resend the code");
      return;
    }
    setMessage("We sent a new code.");
    setResendIn(60);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Animated.View
        style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require("@/assets/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>
            {awaitingOtp ? "Check Your Email" : "Start Your Journey"}
          </Text>
          <Text style={styles.subtitle}>
            {awaitingOtp
              ? "Enter the 6-digit code we sent you"
              : "Create an account to learn Japanese"}
          </Text>
        </View>

        {awaitingOtp ? (
          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            {message ? (
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{message}</Text>
              </View>
            ) : null}

            <TextInput
              style={styles.otpInput}
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
              placeholder="––––––"
              placeholderTextColor={Colors.dark.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              // Lets Android/iOS offer the code straight from the notification.
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              accessibilityLabel="6-digit verification code"
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyOtp}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResendOtp}
              disabled={resendIn > 0}
              activeOpacity={0.7}
              style={styles.resendBtn}
            >
              <Text style={[styles.resendText, resendIn > 0 && styles.resendTextDisabled]}>
                {resendIn > 0 ? `Resend code in ${resendIn}s` : "Didn't get it? Resend code"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setAwaitingOtp(false);
                setOtp("");
                setError("");
                setMessage("");
              }}
              activeOpacity={0.7}
              style={styles.resendBtn}
            >
              <Text style={styles.backText}>← Use a different email</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          {message ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={Colors.dark.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="your@email.com"
              placeholderTextColor={Colors.dark.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Min. 6 characters"
                placeholderTextColor={Colors.dark.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={Colors.dark.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Japanese Level</Text>
            <TouchableOpacity
              style={styles.select}
              onPress={() => setLevelPickerOpen(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Japanese level: ${selectedLevel.label}. Tap to change.`}
            >
              <View style={styles.levelBadgeActive}>
                <Text style={styles.levelBadgeTextActive}>{selectedLevel.value}</Text>
              </View>
              <View style={styles.levelTextWrap}>
                <Text style={styles.selectValue}>{selectedLevel.label}</Text>
                <Text style={styles.levelDesc}>{selectedLevel.desc}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color={Colors.dark.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.consentText}>
            By creating an account, you agree to our{" "}
            <Text
              style={styles.consentLink}
              onPress={() => openUrl(TERMS_URL)}
              accessibilityRole="link"
            >
              Terms &amp; Conditions
            </Text>{" "}
            and{" "}
            <Text
              style={styles.consentLink}
              onPress={() => openUrl(PRIVACY_URL)}
              accessibilityRole="link"
            >
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
        )}

        {!awaitingOtp && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href={{ pathname: "/(auth)/login", params: { redirectTo } } as never} asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        )}

        <Text style={styles.jp}>新しい冒険が始まる 🌸</Text>
      </Animated.View>

      <Modal
        visible={levelPickerOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLevelPickerOpen(false)}
      >
        <View style={styles.modalOverlay} accessibilityViewIsModal>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLevelPickerOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Your Japanese Level</Text>
            {JLPT_SIGNUP_LEVELS.map((option) => {
              const active = jlptLevel === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.levelRow, active && styles.levelRowActive]}
                  onPress={() => {
                    setJlptLevel(option.value);
                    setLevelPickerOpen(false);
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <View style={[styles.levelBadge, active && styles.levelBadgeActive]}>
                    <Text style={[styles.levelBadgeText, active && styles.levelBadgeTextActive]}>
                      {option.value}
                    </Text>
                  </View>
                  <View style={styles.levelTextWrap}>
                    <Text style={[styles.levelLabel, active && styles.levelLabelActive]}>
                      {option.label}
                    </Text>
                    <Text style={styles.levelDesc}>{option.desc}</Text>
                  </View>
                  {active && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.accent[400]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: Spacing["3xl"] },
  header: { alignItems: "center", marginBottom: Spacing["4xl"] },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
    shadowColor: Colors.accent[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  logoImage: { width: "100%", height: "100%" },
  title: {
    fontSize: FontSize["3xl"],
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  subtitle: { fontSize: FontSize.base, color: Colors.dark.textSecondary },
  form: { gap: Spacing.lg },
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  errorText: { color: "#EF4444", fontSize: FontSize.sm, textAlign: "center" },
  messageBox: {
    backgroundColor: "rgba(16,185,129,0.12)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
  },
  messageText: { color: "#6EE7B7", fontSize: FontSize.sm, textAlign: "center" },
  inputGroup: { gap: Spacing.sm },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.dark.textSecondary },
  input: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    fontSize: FontSize.base,
    color: Colors.dark.text,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
  },
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    fontSize: FontSize.base,
    color: Colors.dark.text,
  },
  eyeBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  otpInput: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    fontSize: 32,
    letterSpacing: 12,
    textAlign: "center",
    color: Colors.dark.text,
    borderWidth: 1.5,
    borderColor: Colors.accent[500],
    fontWeight: FontWeight.bold,
  },
  resendBtn: { alignItems: "center", paddingVertical: Spacing.sm },
  resendText: {
    color: Colors.accent[400],
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  resendTextDisabled: { color: Colors.dark.textMuted, fontWeight: FontWeight.medium },
  backText: { color: Colors.dark.textMuted, fontSize: FontSize.sm },
  select: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
  },
  selectValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.dark.text,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: Spacing.xl,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Colors.dark.bg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
    marginTop: Spacing.sm,
  },
  levelRowActive: {
    borderColor: Colors.accent[500],
    backgroundColor: Colors.accent[600] + "20",
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.surface,
  },
  levelBadgeActive: { backgroundColor: Colors.accent[600] },
  levelBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.dark.textSecondary,
  },
  levelBadgeTextActive: { color: "#fff" },
  levelTextWrap: { flex: 1 },
  levelLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.dark.text,
  },
  levelLabelActive: { color: Colors.accent[300] },
  levelDesc: {
    fontSize: FontSize.xs,
    color: Colors.dark.textMuted,
    marginTop: 1,
  },
  button: {
    backgroundColor: Colors.accent[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: "center",
    marginTop: Spacing.sm,
    shadowColor: Colors.accent[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  consentText: {
    textAlign: "center",
    fontSize: FontSize.xs,
    lineHeight: 18,
    color: Colors.dark.textMuted,
    marginTop: Spacing.sm,
  },
  consentLink: {
    color: Colors.accent[400],
    fontWeight: FontWeight.semibold,
    textDecorationLine: "underline",
  },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: Spacing["3xl"] },
  footerText: { color: Colors.dark.textSecondary, fontSize: FontSize.sm },
  footerLink: { color: Colors.accent[400], fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  jp: {
    textAlign: "center",
    marginTop: Spacing["3xl"],
    fontSize: FontSize.sm,
    color: Colors.dark.textMuted,
  },
});
