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
} from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/lib/auth";
import { getSafeRedirectTo } from "@/lib/auth-navigation";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";

export default function SignupScreen() {
  const { signUp } = useAuth();
  const params = useLocalSearchParams<{ redirectTo?: string | string[] }>();
  const redirectTo = getSafeRedirectTo(params.redirectTo);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

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
    const { error: err, hasSession } = await signUp(email, password, name);
    setLoading(false);
    if (err) {
      setError(err.message);
    } else if (!hasSession) {
      setMessage("Check your email to confirm your account, then sign in to continue.");
    } else {
      router.replace(redirectTo as never);
    }
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
            <Text style={styles.logoEmoji}>✨</Text>
          </View>
          <Text style={styles.title}>Start Your Journey</Text>
          <Text style={styles.subtitle}>Create an account to learn Japanese</Text>
        </View>

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
            <TextInput
              style={styles.input}
              placeholder="Min. 6 characters"
              placeholderTextColor={Colors.dark.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
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
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href={{ pathname: "/(auth)/login", params: { redirectTo } } as never} asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <Text style={styles.jp}>新しい冒険が始まる 🌸</Text>
      </Animated.View>
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
    backgroundColor: Colors.accent[600],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
    shadowColor: Colors.accent[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  logoEmoji: { fontSize: 40 },
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
