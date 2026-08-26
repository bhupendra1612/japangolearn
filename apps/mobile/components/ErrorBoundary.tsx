import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import { captureException } from "@/lib/monitoring";

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

/**
 * Catches render errors so a single bad screen shows a recoverable message
 * instead of a blank white app. Sentry.wrap() reports crashes but does not
 * render a fallback.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureException(error, { componentStack: info.componentStack });
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>🙇</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          The app hit an unexpected error. You can try again — your progress is saved.
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.bg,
    padding: Spacing["3xl"],
  },
  emoji: { fontSize: 48, marginBottom: Spacing.lg },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  body: {
    fontSize: FontSize.base,
    color: Colors.dark.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing["2xl"],
  },
  button: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing["3xl"],
  },
  buttonText: { color: "#fff", fontSize: FontSize.base, fontWeight: FontWeight.bold },
});
