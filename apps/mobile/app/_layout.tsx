import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider } from "@/lib/auth";
import { trackEvent } from "@/lib/analytics";
import { initMonitoring, Sentry } from "@/lib/monitoring";
import { Colors } from "@/constants/theme";

initMonitoring();

void SplashScreen.preventAutoHideAsync();

function RootLayout() {
  useEffect(() => {
    trackEvent("mobile_app_opened");

    const timer = setTimeout(() => SplashScreen.hideAsync(), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.dark.bg },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="about" />
      </Stack>
    </AuthProvider>
  );
}

export default Sentry.wrap(RootLayout);
