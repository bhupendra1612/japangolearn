import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { AppState } from "react-native";
import { AuthProvider, useAuth } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { initMonitoring, Sentry } from "@/lib/monitoring";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Colors } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { subscribeToConnectivity } from "@/lib/connectivity";
import { drainOfflineQueue } from "@/lib/offline-queue";

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

function OfflineSynchronizer() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user.id) return;

    const sync = () => {
      void drainOfflineQueue(supabase);
    };

    sync();
    const stopConnectivityMonitor = subscribeToConnectivity(sync);
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });

    return () => {
      stopConnectivityMonitor();
      appStateSubscription.remove();
    };
  }, [session?.user.id]);

  return null;
}

function RootLayout() {
  useEffect(() => {
    trackEvent("mobile_app_opened");
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <StatusBar style="light" />
        <OfflineSynchronizer />
        <RootNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
