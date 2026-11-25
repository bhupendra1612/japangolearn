import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import {
  OFFICIAL_JLPT_POLICY_URL,
  OFFICIAL_JLPT_SOURCE_URL,
  OFFICIAL_N5_COLLECTIONS,
  type OfficialPdf,
} from "@/lib/official-jlpt-resources";

async function openOfficialUrl(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Could not open the official site", "Check your internet connection and try again.");
  }
}

function PdfRow({ pdf }: { pdf: OfficialPdf }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.pdfRow, pressed && styles.pressed]}
      onPress={() => void openOfficialUrl(pdf.url)}
      accessibilityRole="link"
      accessibilityLabel={`Open official JLPT N5 ${pdf.title} PDF in browser`}
      accessibilityHint="Opens the Official Worldwide JLPT Website outside JapanGoLearn"
    >
      <View style={styles.pdfIcon}>
        <Ionicons name="document-text-outline" size={23} color={Colors.primary[200]} />
      </View>
      <View style={styles.pdfCopy}>
        <Text style={styles.pdfTitle}>{pdf.title}</Text>
        <Text style={styles.pdfDescription}>{pdf.description}</Text>
      </View>
      <Ionicons name="open-outline" size={19} color={Colors.dark.textSecondary} />
    </Pressable>
  );
}

export default function OfficialResourcesScreen() {
  const insets = useSafeAreaInsets();
  const [selectedYear, setSelectedYear] = useState(2018);
  const collection =
    OFFICIAL_N5_COLLECTIONS.find((item) => item.year === selectedYear) ??
    OFFICIAL_N5_COLLECTIONS[0];

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing["3xl"] }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.intro}>
        <View style={styles.officialBadge}>
          <Ionicons name="globe-outline" size={15} color={Colors.accent[300]} />
          <Text style={styles.officialBadgeText}>OFFICIAL WORLDWIDE JLPT WEBSITE</Text>
        </View>
        <Text style={styles.introTitle}>N5 practice workbooks</Text>
        <Text style={styles.introText} selectable>
          Explore the official question booklets, answer sheets and answer keys. These are practice
          materials published by JLPT, not copies of previous live exam papers.
        </Text>
      </View>

      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={21} color={Colors.gold[300]} />
        <Text style={styles.disclaimerText} selectable>
          PDFs open on jlpt.jp in your browser. JapanGoLearn does not host, download, reproduce or
          transform them. An internet connection is required.
        </Text>
      </View>

      <View style={styles.collectionHeading}>
        <Text style={styles.sectionTitle}>Choose a collection</Text>
        <Text style={styles.sectionCaption}>Two official N5 practice workbooks</Text>
      </View>
      <View style={styles.collectionChoices}>
        {OFFICIAL_N5_COLLECTIONS.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [
              styles.collectionChoice,
              item.year === selectedYear && styles.collectionChoiceSelected,
              pressed && styles.pressed,
            ]}
            onPress={() => setSelectedYear(item.year)}
            accessibilityRole="button"
            accessibilityState={{ selected: item.year === selectedYear }}
          >
            <Text
              style={[
                styles.collectionChoiceText,
                item.year === selectedYear && styles.collectionChoiceTextSelected,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.collectionTitleBlock}>
        <Text style={styles.collectionTitle}>{collection.title}</Text>
        <Text style={styles.collectionSubtitle} selectable>
          Published {collection.year} · N5 · 7 official PDFs
        </Text>
      </View>

      <Text style={styles.groupTitle}>Test sections</Text>
      {collection.pdfs
        .filter((pdf) => pdf.group === "Test sections")
        .map((pdf) => <PdfRow key={pdf.id} pdf={pdf} />)}

      <Text style={styles.groupTitle}>Review materials</Text>
      {collection.pdfs
        .filter((pdf) => pdf.group === "Review materials")
        .map((pdf) => <PdfRow key={pdf.id} pdf={pdf} />)}

      <View style={styles.sourceCard}>
        <Text style={styles.sourceTitle}>Use the official source page</Text>
        <Text style={styles.sourceText} selectable>
          The JLPT page also provides the matching listening audio and notes about these materials.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.sourceButton, pressed && styles.pressed]}
          onPress={() => void openOfficialUrl(OFFICIAL_JLPT_SOURCE_URL)}
          accessibilityRole="link"
          accessibilityLabel="Open official JLPT practice workbook source page"
        >
          <Text style={styles.sourceButtonText}>Open JLPT source page</Text>
          <Ionicons name="open-outline" size={18} color={Colors.accent[300]} />
        </Pressable>
        <Pressable
          onPress={() => void openOfficialUrl(OFFICIAL_JLPT_POLICY_URL)}
          accessibilityRole="link"
          accessibilityLabel="Read the official JLPT site policy"
        >
          <Text style={styles.policyLink}>JLPT site policy</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.bg },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.md },
  intro: { gap: Spacing.sm },
  officialBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: `${Colors.accent[700]}30`,
    borderRadius: BorderRadius.full,
  },
  officialBadgeText: {
    color: Colors.accent[300],
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
  },
  introTitle: { color: Colors.dark.text, fontSize: FontSize["2xl"], fontWeight: FontWeight.bold },
  introText: { color: Colors.dark.textSecondary, fontSize: FontSize.sm, lineHeight: 20 },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: `${Colors.gold[600]}18`,
    borderWidth: 1,
    borderColor: `${Colors.gold[600]}40`,
    borderRadius: BorderRadius.lg,
  },
  disclaimerText: { flex: 1, color: Colors.dark.textSecondary, fontSize: FontSize.xs, lineHeight: 18 },
  collectionHeading: { marginTop: Spacing.sm, gap: 3 },
  sectionTitle: { color: Colors.dark.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  sectionCaption: { color: Colors.dark.textMuted, fontSize: FontSize.xs },
  collectionChoices: { flexDirection: "row", gap: Spacing.sm },
  collectionChoice: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: BorderRadius.lg,
  },
  collectionChoiceSelected: {
    backgroundColor: `${Colors.primary[500]}22`,
    borderColor: Colors.primary[400],
  },
  collectionChoiceText: { color: Colors.dark.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  collectionChoiceTextSelected: { color: Colors.primary[200] },
  collectionTitleBlock: { gap: 3, marginTop: Spacing.sm },
  collectionTitle: { color: Colors.dark.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  collectionSubtitle: { color: Colors.dark.textMuted, fontSize: FontSize.xs },
  groupTitle: {
    color: Colors.primary[200],
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    marginTop: Spacing.sm,
  },
  pdfRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.dark.card,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: BorderRadius.lg,
  },
  pressed: { opacity: 0.7 },
  pdfIcon: {
    width: 43,
    height: 43,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${Colors.primary[500]}22`,
    borderRadius: BorderRadius.md,
  },
  pdfCopy: { flex: 1, gap: 3 },
  pdfTitle: { color: Colors.dark.text, fontSize: FontSize.base, fontWeight: FontWeight.semibold },
  pdfDescription: { color: Colors.dark.textMuted, fontSize: FontSize.xs, lineHeight: 16 },
  sourceCard: {
    gap: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: Colors.dark.cardAlt,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: `${Colors.accent[500]}45`,
    marginTop: Spacing.sm,
  },
  sourceTitle: { color: Colors.dark.text, fontSize: FontSize.base, fontWeight: FontWeight.bold },
  sourceText: { color: Colors.dark.textSecondary, fontSize: FontSize.xs, lineHeight: 18 },
  sourceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    backgroundColor: `${Colors.accent[700]}30`,
    borderRadius: BorderRadius.md,
  },
  sourceButtonText: { color: Colors.accent[300], fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  policyLink: { color: Colors.dark.textSecondary, fontSize: FontSize.xs, textDecorationLine: "underline" },
});
