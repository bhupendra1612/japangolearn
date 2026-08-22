import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";

/**
 * Shown when a screen's data could not be loaded.
 *
 * Screens used to drop the error and resolve the spinner into an empty list, so
 * a dropped connection was indistinguishable from "there is nothing here" — no
 * message, nothing to retry, and nothing reported. This gives the failure a
 * face and a way out.
 */
export function LoadError({
  onRetry,
  retrying = false,
  offline = false,
  message = "We could not load this right now.",
}: {
  onRetry: () => void;
  retrying?: boolean;
  /** The request never reached the server, rather than the server failing. */
  offline?: boolean;
  message?: string;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons
          name={offline ? "cloud-offline-outline" : "alert-circle-outline"}
          size={30}
          color={Colors.dark.textMuted}
        />
      </View>
      <Text style={styles.title}>{offline ? "You are offline" : message}</Text>
      <Text style={styles.hint}>
        {offline
          ? "Connect to the internet and try again. Anything you have opened before stays available."
          : "This is our end, not yours. Please try again in a moment."}
      </Text>
      <TouchableOpacity
        style={[styles.button, retrying && styles.buttonBusy]}
        onPress={onRetry}
        disabled={retrying}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Try loading again"
        accessibilityState={{ disabled: retrying }}
      >
        <Ionicons name="refresh" size={17} color={Colors.dark.text} />
        <Text style={styles.buttonText}>{retrying ? "Retrying…" : "Try again"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dark.card,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  title: {
    color: Colors.dark.text,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    textAlign: "center",
  },
  hint: {
    color: Colors.dark.textMuted,
    fontSize: FontSize.sm,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary[600],
  },
  buttonBusy: { opacity: 0.6 },
  buttonText: {
    color: Colors.dark.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
