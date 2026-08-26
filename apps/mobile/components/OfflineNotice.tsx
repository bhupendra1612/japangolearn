import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import { describeAge } from "@/lib/offline-cache";

/**
 * Shown above content that came from the cache because the request failed.
 *
 * Without it, cached content is indistinguishable from live content, and a
 * learner could sit with a stale screen believing it is current. Naming the age
 * is the honest version.
 */
export function OfflineNotice({ savedAt, onRetry }: { savedAt: number; onRetry: () => void }) {
  return (
    <View style={styles.bar}>
      <Ionicons name="cloud-offline-outline" size={15} color={Colors.gold[400]} />
      <Text style={styles.text} numberOfLines={1}>
        Offline · saved {describeAge(savedAt)}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Retry loading live content"
      >
        <Text style={styles.action}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gold[400] + "18",
    borderWidth: 1,
    borderColor: Colors.gold[400] + "35",
  },
  text: {
    flex: 1,
    color: Colors.gold[400],
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  action: {
    color: Colors.gold[400],
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textDecorationLine: "underline",
  },
});
