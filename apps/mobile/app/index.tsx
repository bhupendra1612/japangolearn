import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "@/lib/auth";
import { Colors } from "@/constants/theme";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDED_KEY = "@easyjapanese_onboarded";

export default function Index() {
  const { session, loading, isGuest } = useAuth();

  useEffect(() => {
    if (loading) return;

    const navigate = async () => {
      if (session) {
        router.replace("/(tabs)");
        return;
      }
      if (isGuest) {
        router.replace("/(tabs)");
        return;
      }
      // Check if user has seen onboarding
      const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY);
      if (onboarded) {
        router.replace("/(auth)/login");
      } else {
        await AsyncStorage.setItem(ONBOARDED_KEY, "true");
        router.replace("/onboarding");
      }
    };

    navigate();
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
