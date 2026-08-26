import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "@/lib/auth";
import { Colors } from "@/constants/theme";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ONBOARDED_KEY } from "@/constants/storage";
import { consumePendingRedirect, DEFAULT_AUTHENTICATED_ROUTE } from "@/lib/auth-navigation";

/**
 * The single redirect authority for the app. Every auth transition (sign in,
 * sign up, sign out, guest mode) routes back here rather than navigating
 * directly, because <Stack.Protected> adds and removes route groups as the
 * session changes and any navigation aimed at a group that is mid-swap gets
 * dropped. This screen is never protected, so it is always a safe target.
 */
export default function Index() {
  const { session, loading, isGuest } = useAuth();

  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    const navigate = async () => {
      if (session || isGuest) {
        const target = consumePendingRedirect() ?? DEFAULT_AUTHENTICATED_ROUTE;
        if (!cancelled) router.replace(target as never);
        return;
      }

      const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY);
      if (cancelled) return;

      router.replace(onboarded ? "/(auth)/login" : "/onboarding");
    };

    void navigate();

    return () => {
      cancelled = true;
    };
  }, [session, loading, isGuest]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary[500]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.dark.bg,
  },
});
