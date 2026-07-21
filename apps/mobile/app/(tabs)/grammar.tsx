import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from "@/constants/theme";
import type { Json } from "@japangolearn/database";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type Example = { japanese: string; romaji: string; english: string };
type Pattern = {
  id: number;
  title: string;
  structure: string;
  meaning: string;
  explanation: string;
  examples: Example[];
  category: string;
  jlpt_level: string;
};

function normalizeExamples(value: Json): Example[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || Array.isArray(item) || typeof item !== "object") return [];

    const japanese =
      typeof item.japanese === "string"
        ? item.japanese
        : typeof item.jp === "string"
          ? item.jp
          : "";
    const english =
      typeof item.english === "string" ? item.english : typeof item.en === "string" ? item.en : "";
    const romaji = typeof item.romaji === "string" ? item.romaji : "";

    return japanese && english ? [{ japanese, romaji, english }] : [];
  });
}

export default function GrammarScreen() {
  const insets = useSafeAreaInsets();
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    const { data } = await supabase
      .from("grammar_patterns")
      .select("*")
      .eq("jlpt_level", "N5")
      .order("order_index");
    if (data) {
      setPatterns(
        data.map((pattern) => ({ ...pattern, examples: normalizeExamples(pattern.examples) }))
      );
    }
    setLoading(false);
  };

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const getCategoryColor = (cat: string) => {
    const map: Record<string, string> = {
      particles: Colors.primary[500],
      verbs: Colors.accent[500],
      adjectives: Colors.sakura[500],
      expressions: Colors.gold[500],
      questions: Colors.primary[400],
    };
    return map[cat.toLowerCase()] || Colors.primary[500];
  };

  const renderPattern = ({ item }: { item: Pattern }) => {
    const isExpanded = expandedId === item.id;
    const catColor = getCategoryColor(item.category);

    return (
      <TouchableOpacity
        style={[styles.card, isExpanded && styles.cardExpanded]}
        activeOpacity={0.8}
        onPress={() => toggleExpand(item.id)}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.catDot, { backgroundColor: catColor }]} />
            <View style={styles.cardTitleGroup}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardStructure}>{item.structure}</Text>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={Colors.dark.textMuted}
          />
        </View>

        {/* Meaning */}
        <Text style={styles.meaning}>{item.meaning}</Text>

        {/* Category Badge */}
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: catColor + "25" }]}>
            <Text style={[styles.badgeText, { color: catColor }]}>{item.category}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeTextLevel}>{item.jlpt_level}</Text>
          </View>
        </View>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.expanded}>
            {/* Explanation */}
            <View style={styles.explanationBox}>
              <Text style={styles.explanationLabel}>📝 Explanation</Text>
              <Text style={styles.explanationText}>{item.explanation}</Text>
            </View>

            {/* Examples */}
            {Array.isArray(item.examples) && item.examples.length > 0 && (
              <View style={styles.examplesSection}>
                <Text style={styles.examplesLabel}>💡 Examples</Text>
                {item.examples.map((ex, i) => (
                  <View key={i} style={styles.exampleCard}>
                    <Text style={styles.exJp}>{ex.japanese}</Text>
                    <Text style={styles.exRomaji}>{ex.romaji}</Text>
                    <Text style={styles.exEn}>{ex.english}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}>
        <Text style={styles.title}>📝 Grammar</Text>
        <Text style={styles.subtitle}>{patterns.length} JLPT N5 patterns</Text>
      </View>

      <FlatList
        data={patterns}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPattern}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📚</Text>
              <Text style={styles.emptyText}>No grammar patterns found</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.bg },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing["5xl"], paddingBottom: Spacing.md },
  title: { fontSize: FontSize["2xl"], fontWeight: FontWeight.bold, color: Colors.dark.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.dark.textMuted, marginTop: 2 },

  list: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing["5xl"] },

  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  cardExpanded: { borderColor: Colors.primary[700] },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  cardHeaderLeft: { flexDirection: "row", alignItems: "flex-start", flex: 1, gap: Spacing.md },
  catDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  cardTitleGroup: { flex: 1 },
  cardTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.dark.text },
  cardStructure: { fontSize: FontSize.sm, color: Colors.primary[300], marginTop: 2 },

  meaning: {
    fontSize: FontSize.sm,
    color: Colors.dark.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },

  badges: { flexDirection: "row", gap: Spacing.sm },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.dark.surface,
  },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, textTransform: "uppercase" },
  badgeTextLevel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.accent[400] },

  expanded: { marginTop: Spacing.xl },
  explanationBox: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  explanationLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    marginBottom: Spacing.sm,
  },
  explanationText: { fontSize: FontSize.sm, color: Colors.dark.textSecondary, lineHeight: 20 },

  examplesSection: { gap: Spacing.md },
  examplesLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.dark.text },
  exampleCard: {
    backgroundColor: Colors.dark.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary[500],
  },
  exJp: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  exRomaji: { fontSize: FontSize.sm, color: Colors.primary[300], marginBottom: 4 },
  exEn: { fontSize: FontSize.sm, color: Colors.accent[400] },

  empty: { alignItems: "center", paddingTop: Spacing["5xl"] },
  emptyEmoji: { fontSize: 40, marginBottom: Spacing.md },
  emptyText: { color: Colors.dark.textMuted, fontSize: FontSize.base },
});
