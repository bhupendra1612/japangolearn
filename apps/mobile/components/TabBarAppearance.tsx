import { StyleSheet, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { BottomTabNavigationOptions } from "expo-router/js-tabs";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const tabs = {
  home: { title: "Home", icon: "home-outline", selectedIcon: "home", color: "#C4B8F0" },
  courses: { title: "Courses", icon: "library-outline", selectedIcon: "library", color: "#C4B8F0" },
  vocabulary: { title: "Vocab", icon: "book-outline", selectedIcon: "book", color: "#8CDECF" },
  grammar: { title: "Grammar", icon: "school-outline", selectedIcon: "school", color: "#99C7FA" },
  practice: { title: "Practice", icon: "albums-outline", selectedIcon: "albums", color: "#EAC88F" },
  profile: { title: "Profile", icon: "person-outline", selectedIcon: "person", color: "#F0B3CE" },
} satisfies Record<
  string,
  { title: string; icon: IconName; selectedIcon: IconName; color: string }
>;

export function tabOptions(key: keyof typeof tabs): BottomTabNavigationOptions {
  const tab = tabs[key];
  return {
    title: tab.title,
    tabBarAccessibilityLabel: tab.title,
    tabBarButtonTestID: `bottom-tab-${key}`,
    tabBarActiveTintColor: tab.color,
    tabBarIcon: ({ focused, color }) => (
      <View
        accessible={false}
        style={[
          styles.iconWell,
          focused && { backgroundColor: tab.color + "1C", borderColor: tab.color + "50" },
        ]}
      >
        <Ionicons name={focused ? tab.selectedIcon : tab.icon} size={22} color={color} />
      </View>
    ),
  };
}

export function tabBarAppearance(bottomInset: number): BottomTabNavigationOptions {
  const bottomPadding = Math.max(bottomInset, Platform.OS === "android" ? 10 : 6);
  return {
    tabBarShowLabel: true,
    tabBarLabelPosition: "below-icon",
    tabBarActiveTintColor: "#C4B8F0",
    tabBarInactiveTintColor: "#97A8C0",
    tabBarStyle: {
      backgroundColor: "#142035",
      borderTopColor: "#33455E",
      borderTopWidth: 1,
      height: 64 + bottomPadding,
      paddingTop: 5,
      paddingBottom: bottomPadding,
      elevation: 0,
      shadowColor: "#050C18",
      shadowOffset: { width: 0, height: -3 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
    },
    tabBarBackground: () => (
      <LinearGradient
        colors={["#1A2941", "#111D30"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    ),
    tabBarIconStyle: { width: 46, height: 32 },
    tabBarLabelStyle: {
      fontSize: 10,
      lineHeight: 14,
      fontWeight: "600",
      marginTop: 2,
      flexShrink: 0,
    },
    tabBarItemStyle: { paddingHorizontal: 2 },
  };
}

const styles = StyleSheet.create({
  iconWell: {
    width: 46,
    height: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
});
