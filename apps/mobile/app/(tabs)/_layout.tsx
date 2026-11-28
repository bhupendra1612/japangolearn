import { useState } from "react";
import { Tabs } from "expo-router";
import { View, TouchableOpacity, StyleSheet, PanResponder } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/lib/auth";
import { featureFlags } from "@/lib/feature-flags";
import { tabBarAppearance, tabOptions } from "@/components/TabBarAppearance";

export default function TabLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  // Edge swipe to open sidebar
  const [panResponder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Trigger only if swipe starts from the left edge (e.g., within 30 pixels)
        // and is moving rightwards
        return (
          gestureState.x0 < 30 &&
          gestureState.dx > 10 &&
          gestureState.dy < 20 &&
          gestureState.dy > -20
        );
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 50) {
          setSidebarOpen(true);
        }
      },
    })
  );

  const renderHeaderLeft = () => (
    <TouchableOpacity
      onPress={() => setSidebarOpen(true)}
      style={styles.menuBtn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
    >
      <Ionicons name="menu" size={26} color={Colors.dark.text} />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <Tabs
        screenOptions={{
          // Off by default. A transparent header still renders an absolutely
          // positioned, touch-absorbing bar across the top ~64px, so on screens
          // that put nothing in it, it silently swallowed taps on whatever the
          // screen drew there — which is what broke the back button on the
          // Writing and Vocabulary detail views. Only Home and Profile put
          // content in the header (the sidebar button); they re-enable it.
          // Every screen already applies its own paddingTop: insets.top.
          headerShown: false,
          headerStyle: { backgroundColor: "transparent" },
          headerTintColor: Colors.dark.text,
          headerShadowVisible: false,
          ...tabBarAppearance(insets.bottom),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            ...tabOptions("home"),
            headerShown: true,
            headerTransparent: true,
            headerTitle: "",
            headerLeft: renderHeaderLeft,
          }}
        />
        <Tabs.Screen
          name="courses"
          options={{
            ...tabOptions("courses"),
            headerTransparent: true,
            headerTitle: "",
            // Marketplace is deferred past v1. href: null keeps the route
            // registered (so the screen file stays valid) but removes it from
            // the tab bar; the screen itself redirects when the flag is off.
            href: featureFlags.courseCatalog ? undefined : null,
          }}
        />
        <Tabs.Screen
          name="vocabulary"
          options={{
            ...tabOptions("vocabulary"),
            headerTransparent: true,
            headerTitle: "",
          }}
        />
        <Tabs.Screen
          name="grammar"
          options={{
            ...tabOptions("grammar"),
            headerTransparent: true,
            headerTitle: "",
          }}
        />
        <Tabs.Screen
          name="writing"
          options={{
            title: "Writing",
            headerTransparent: true,
            headerTitle: "",
            // Kept off the tab bar to hold the bar at five items. Writing is
            // still reachable from Quick Actions on Home and from the Sidebar.
            tabBarButton: () => null,
          }}
        />
        <Tabs.Protected guard={!!session}>
          <Tabs.Screen
            name="practice"
            options={{
              ...tabOptions("practice"),
              headerTransparent: true,
              headerTitle: "",
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              ...tabOptions("profile"),
              headerShown: true,
              headerTransparent: true,
              headerTitle: "",
              headerLeft: renderHeaderLeft,
            }}
          />
          <Tabs.Screen
            name="achievements"
            options={{
              title: "Trophies",
              headerTransparent: true,
              headerTitle: "",
              // Kept off the tab bar to hold the bar at five items. Trophies is
              // reached from the Progress card on Profile, and from the Sidebar.
              tabBarButton: () => null,
            }}
          />
        </Tabs.Protected>
        <Tabs.Screen
          name="kanji"
          options={{
            title: "Kanji",
            tabBarButton: () => null,
            headerTransparent: true,
            headerTitle: "",
          }}
        />
      </Tabs>

      {/* Sidebar overlay rendered on top of everything */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  menuBtn: {
    marginLeft: 16,
    padding: 4,
  },
});
