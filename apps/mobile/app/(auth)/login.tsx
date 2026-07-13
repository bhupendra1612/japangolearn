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
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    console.log("[Login] Attempting sign in with:", email);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) {
      console.error("[Login] Error:", JSON.stringify(err));
      setError(err.message || JSON.stringify(err));
    } else {
      console.log("[Login] Success!");
      router.replace("/(tabs)");
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
        {/* Logo & Title */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🇯🇵</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue learning Japanese</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

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
              placeholder="••••••••"
              placeholderTextColor={Colors.dark.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <Text style={styles.jp}>日本語の旅を続けよう</Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing["3xl"],
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["4xl"],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primary[600],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: FontSize["3xl"],
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.dark.textSecondary,
  },
  form: {
    gap: Spacing.lg,
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  errorText: {
    color: "#EF4444",
    fontSize: FontSize.sm,
    textAlign: "center",
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.dark.textSecondary,
  },
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
    backgroundColor: Colors.primary[500],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: "center",
    marginTop: Spacing.sm,
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing["3xl"],
  },
  footerText: {
    color: Colors.dark.textSecondary,
    fontSize: FontSize.sm,
  },
  footerLink: {
    color: Colors.primary[400],
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  jp: {
    textAlign: "center",
    marginTop: Spacing["3xl"],
    fontSize: FontSize.sm,
    color: Colors.dark.textMuted,
  },
});
