import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type KanjiIcon = React.ComponentProps<typeof Ionicons>["name"];
export const K = {
  bg: "#101222",
  card: "#1B1E32",
  border: "#30354E",
  text: "#F6F4FF",
  muted: "#ADB4CF",
  purple: "#C4AEFF",
  green: "#74E0BC",
  blue: "#8BBEFF",
  amber: "#FFD083",
  pink: "#FFA5CD",
};
const topics: Record<string, { icon: KanjiIcon; color: string; label: string }> = {
  nature: { icon: "leaf", color: K.green, label: "Nature" },
  basic: { icon: "shapes", color: K.purple, label: "Essentials" },
  time: { icon: "time", color: K.amber, label: "Time" },
  people: { icon: "people", color: K.pink, label: "People" },
  element: { icon: "planet", color: K.blue, label: "Elements" },
  calendar: { icon: "calendar", color: K.purple, label: "Calendar" },
  geography: { icon: "earth", color: K.green, label: "Places" },
  water: { icon: "water", color: K.blue, label: "Water" },
  plant: { icon: "flower", color: K.green, label: "Plants" },
  energy: { icon: "flame", color: "#FFB28A", label: "Energy" },
  money: { icon: "wallet", color: K.amber, label: "Money" },
  number: { icon: "calculator", color: K.blue, label: "Numbers" },
  numbers: { icon: "calculator", color: K.blue, label: "Numbers" },
  body: { icon: "body", color: K.pink, label: "Body" },
  movement: { icon: "walk", color: K.green, label: "Movement" },
  abstract: { icon: "color-wand", color: K.pink, label: "Ideas" },
  action: { icon: "flash", color: K.amber, label: "Actions" },
  adjective: { icon: "color-palette", color: K.blue, label: "Descriptions" },
  business: { icon: "briefcase", color: K.blue, label: "Business" },
  color: { icon: "color-palette", color: K.pink, label: "Colors" },
  communication: { icon: "chatbubbles", color: K.blue, label: "Communication" },
  concept: { icon: "bulb", color: K.amber, label: "Concepts" },
  creation: { icon: "construct", color: K.amber, label: "Making" },
  daily: { icon: "sunny", color: K.amber, label: "Everyday" },
  direction: { icon: "compass", color: K.blue, label: "Directions" },
  education: { icon: "school", color: K.purple, label: "Learning" },
  existence: { icon: "sparkles", color: K.green, label: "Existence" },
  family: { icon: "heart", color: K.pink, label: "Family" },
  food: { icon: "restaurant", color: K.amber, label: "Food" },
  interaction: { icon: "chatbubbles", color: K.blue, label: "Interaction" },
  life: { icon: "heart", color: K.pink, label: "Life" },
  mental: { icon: "bulb", color: K.purple, label: "Mind" },
  object: { icon: "cube", color: K.blue, label: "Objects" },
  person: { icon: "person", color: K.pink, label: "Person" },
  place: { icon: "location", color: K.green, label: "Places" },
  position: { icon: "navigate", color: K.blue, label: "Position" },
  quantity: { icon: "calculator", color: K.purple, label: "Quantity" },
  question: { icon: "help-circle", color: K.amber, label: "Questions" },
  size: { icon: "resize", color: K.green, label: "Size" },
  social: { icon: "people-circle", color: K.pink, label: "Social" },
};
export function topicStyle(tag?: string) {
  return (
    topics[tag ?? ""] ?? {
      icon: "sparkles" as KanjiIcon,
      color: K.purple,
      label: tag ? tag.charAt(0).toUpperCase() + tag.slice(1) : "Essentials",
    }
  );
}
export function ColorIcon({
  name,
  color = K.purple,
  size = 38,
}: {
  name: KanjiIcon;
  color?: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: color + "18",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={size * 0.52} color={color} />
    </View>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  color = K.muted,
  selected,
  disabled,
}: {
  name: KanjiIcon;
  label: string;
  onPress: () => void;
  color?: string;
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        u.iconButton,
        selected && { backgroundColor: color + "20" },
        disabled && { opacity: 0.35 },
      ]}
      activeOpacity={0.7}
    >
      <Ionicons name={name} size={21} color={color} />
    </TouchableOpacity>
  );
}
export function Action({
  label,
  icon,
  onPress,
  primary,
  disabled,
  color = K.purple,
}: {
  label: string;
  icon: KanjiIcon;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        u.action,
        primary && { backgroundColor: color, borderColor: color },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Ionicons name={icon} size={19} color={primary ? K.bg : color} />
      <Text style={[u.actionText, { color: primary ? K.bg : K.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}
export const u = StyleSheet.create({
  screen: { flex: 1, backgroundColor: K.bg },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { color: K.text, fontSize: 25, fontWeight: "800", letterSpacing: -0.7 },
  text: { color: K.text, fontSize: 15, lineHeight: 23 },
  muted: { color: K.muted, fontSize: 13, lineHeight: 20 },
  eyebrow: { color: K.purple, fontSize: 10, fontWeight: "800", letterSpacing: 1.8 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  action: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: K.border,
    backgroundColor: K.card,
  },
  actionText: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
  panel: {
    backgroundColor: K.card,
    borderWidth: 1,
    borderColor: K.border,
    padding: 18,
    borderRadius: 22,
    gap: 12,
  },
  sectionTitle: { color: K.text, fontSize: 16, fontWeight: "700" },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: K.purple + "16",
  },
  pillText: { fontSize: 11, fontWeight: "700", color: K.purple },
  notice: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: K.amber + "10",
    borderWidth: 1,
    borderColor: K.amber + "40",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
