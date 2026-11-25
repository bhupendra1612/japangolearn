import { Stack } from "expo-router";
import { Colors } from "@/constants/theme";

export default function ExamLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen
        name="official-resources"
        options={{
          headerShown: true,
          title: "Official JLPT resources",
          headerStyle: { backgroundColor: Colors.dark.bg },
          headerTintColor: Colors.dark.text,
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
