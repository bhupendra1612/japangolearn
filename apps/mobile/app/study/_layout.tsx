import { Stack } from "expo-router";
import { Colors } from "@/constants/theme";

/**
 * Without this layout the study screens register as flat routes
 * ("study/flashcards", "study/quiz"), so the <Stack.Screen name="study" />
 * guard in the root layout matched nothing and never protected them.
 */
export default function StudyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.dark.bg },
        animation: "slide_from_right",
      }}
    />
  );
}
