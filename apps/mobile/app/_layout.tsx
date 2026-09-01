import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { initMonitoring, Sentry } from "@/lib/monitoring";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Colors } from "@/constants/theme";

initMonitoring();

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { loading, session, isGuest } = useAuth();

  useEffect(() => {
    if (!loading) {
      void SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.dark.bg },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" options={{ animation: "fade" }} />

      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={!!session || isGuest}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>

      <Stack.Protected guard={!!session}>
        <Stack.Screen name="study" />
      </Stack.Protected>

      <Stack.Screen name="about" />
    </Stack>
  );
}

function RootLayout() {
  useEffect(() => {
    trackEvent("mobile_app_opened");
  }, []);

  return (
    // Required by react-native-gesture-handler, which powers the draggable
    // practice-list reordering. Wraps the whole tree so any gesture-based UI
    // works wherever it is used.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
