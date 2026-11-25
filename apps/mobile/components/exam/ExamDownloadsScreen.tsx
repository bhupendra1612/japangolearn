import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import {
  formatPackSize,
  getInstalledExamPack,
  installExamPack,
  N5_OFFLINE_PACK,
  printExamPackPdf,
  removeExamPack,
  shareExamPackPdf,
  type ExamPackProgress,
  type InstalledExamPack,
  type PrintablePdfKind,
} from "@/lib/exam-packs";

export default function ExamDownloadsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [installed, setInstalled] = useState<InstalledExamPack | null>(null);
  const [checking, setChecking] = useState(true);
  const [progress, setProgress] = useState<ExamPackProgress | null>(null);
  const [busyPdf, setBusyPdf] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setChecking(true);
    setInstalled(await getInstalledExamPack());
    setChecking(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const download = async () => {
    setProgress({
      completedFiles: 0,
      totalFiles: 23,
      downloadedBytes: 0,
      totalBytes: N5_OFFLINE_PACK.estimatedBytes,
      currentFile: "Preparing download",
    });
    try {
      const result = await installExamPack(setProgress);
      setInstalled(result);
      setProgress(null);
      Alert.alert("Ready offline", "The complete mock, listening audio, and PDFs are saved.");
    } catch (error) {
      setProgress(null);
      Alert.alert("Download failed", error instanceof Error ? error.message : "Please try again.");
    }
  };

  const confirmRemove = () => {
    Alert.alert(
      "Remove offline pack?",
      "Attempt history stays safe. Downloaded audio and PDFs will be removed from this device.",
      [
        { text: "Keep pack", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void removeExamPack().then(() => setInstalled(null));
          },
        },
      ]
    );
  };

  const runPdfAction = async (kind: PrintablePdfKind, action: "print" | "share") => {
    const actionKey = `${kind}-${action}`;
    setBusyPdf(actionKey);
    try {
      if (action === "print") await printExamPackPdf(kind);
      else await shareExamPackPdf(kind);
    } catch (error) {
      Alert.alert(
        action === "print" ? "Could not print" : "Could not share",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setBusyPdf(null);
    }
  };

  const progressPercent = progress
    ? Math.round((progress.completedFiles / Math.max(1, progress.totalFiles)) * 100)
    : 0;
  const canUseLocalFiles = Platform.OS === "web" || !!installed;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark.text} />
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.eyebrow}>EXAM CENTER</Text>
            <Text style={styles.title}>Offline & print</Text>
          </View>
          <View style={styles.iconButtonPlaceholder} />
        </View>

        <LinearGradient colors={["#4C1D95", "#1A1433", "#164E63"]} style={styles.hero}>
          <View style={styles.packTopRow}>
            <View style={styles.packIcon}>
              <Ionicons name="cloud-download-outline" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.packLevel}>{N5_OFFLINE_PACK.level} · VERSION 3</Text>
              <Text style={styles.packTitle}>{N5_OFFLINE_PACK.title}</Text>
            </View>
            {installed ? (
              <View style={styles.readyBadge}>
                <Ionicons name="checkmark" size={14} color="#6EE7B7" />
                <Text style={styles.readyText}>READY</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.packDescription}>{N5_OFFLINE_PACK.description}</Text>
          <View style={styles.factRow}>
            <PackFact icon="help-circle-outline" value="36" label="questions" />
            <PackFact icon="headset-outline" value="20" label="tracks" />
            <PackFact
              icon="phone-portrait-outline"
              value={formatPackSize(
                installed?.manifest.totalBytes ?? N5_OFFLINE_PACK.estimatedBytes
              )}
              label="download"
            />
          </View>

          {progress ? (
            <View style={styles.progressCard}>
              <View style={styles.progressTop}>
                <Text style={styles.progressTitle}>Downloading {progressPercent}%</Text>
                <Text style={styles.progressMeta}>
                  {progress.completedFiles}/{progress.totalFiles} files
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressFile} numberOfLines={1}>
                {progress.currentFile}
              </Text>
            </View>
          ) : checking ? (
            <ActivityIndicator color={Colors.primary[200]} />
          ) : installed ? (
            <View style={styles.installedActions}>
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => router.push("/exam/run?mode=full" as never)}
              >
                <Ionicons name="play" size={19} color="#fff" />
                <Text style={styles.startText}>Start offline mock</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeButton} onPress={confirmRemove}>
                <Ionicons name="trash-outline" size={19} color="#FCA5A5" />
              </TouchableOpacity>
            </View>
          ) : Platform.OS === "web" ? (
            <Text style={styles.webNotice}>
              Open the mobile app on Android or iOS to install the full offline pack.
            </Text>
          ) : (
            <TouchableOpacity style={styles.downloadButton} onPress={() => void download()}>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text style={styles.downloadText}>Download for offline use</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Printable PDFs</Text>
          <Text style={styles.sectionSubtitle}>
            A4 layouts with space to mark answers. Print directly or share the file.
          </Text>
        </View>

        <PdfCard
          title="N5 Mock 1 test paper"
          subtitle="12 pages · questions and answer sheet"
          icon="document-text-outline"
          color={Colors.primary[400]}
          disabled={!canUseLocalFiles}
          busyPdf={busyPdf}
          kind="test-paper"
          onAction={runPdfAction}
        />
        <PdfCard
          title="Answer & explanation key"
          subtitle="16 pages · transcripts and explanations"
          icon="checkmark-done-outline"
          color={Colors.accent[400]}
          disabled={!canUseLocalFiles}
          busyPdf={busyPdf}
          kind="answer-key"
          onAction={runPdfAction}
        />

        {!canUseLocalFiles ? (
          <View style={styles.lockedNotice}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.gold[300]} />
            <Text style={styles.lockedText}>
              Download the pack once to print or share PDFs offline.
            </Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={22} color="#6EE7B7" />
          <Text style={styles.infoText}>
            Downloads are checksum-verified before installation. Removing a pack never removes your
            saved attempts or practice lists.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function PackFact({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={17} color={Colors.primary[200]} />
      <Text style={styles.factValue}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

function PdfCard({
  title,
  subtitle,
  icon,
  color,
  disabled,
  busyPdf,
  kind,
  onAction,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  disabled: boolean;
  busyPdf: string | null;
  kind: PrintablePdfKind;
  onAction: (kind: PrintablePdfKind, action: "print" | "share") => Promise<void>;
}) {
  return (
    <View style={[styles.pdfCard, disabled && { opacity: 0.55 }]}>
      <View style={[styles.pdfIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={25} color={color} />
      </View>
      <View style={styles.pdfCopy}>
        <Text style={styles.pdfTitle}>{title}</Text>
        <Text style={styles.pdfSubtitle}>{subtitle}</Text>
        <View style={styles.pdfActions}>
          <TouchableOpacity
            style={styles.pdfAction}
            disabled={disabled || busyPdf !== null}
            onPress={() => void onAction(kind, "print")}
          >
            {busyPdf === `${kind}-print` ? (
              <ActivityIndicator size="small" color={Colors.primary[300]} />
            ) : (
              <Ionicons name="print-outline" size={17} color={Colors.primary[300]} />
            )}
            <Text style={styles.pdfActionText}>{Platform.OS === "web" ? "Open" : "Print"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pdfAction}
            disabled={disabled || busyPdf !== null}
            onPress={() => void onAction(kind, "share")}
          >
            {busyPdf === `${kind}-share` ? (
              <ActivityIndicator size="small" color={Colors.primary[300]} />
            ) : (
              <Ionicons name="share-outline" size={17} color={Colors.primary[300]} />
            )}
            <Text style={styles.pdfActionText}>{Platform.OS === "web" ? "Download" : "Share"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.dark.bg },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 48, gap: Spacing.md },
  topBar: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.card,
  },
  iconButtonPlaceholder: { width: 44 },
  eyebrow: {
    color: Colors.primary[300],
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.3,
  },
  title: { color: Colors.dark.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  hero: {
    borderRadius: BorderRadius["2xl"],
    padding: Spacing.xl,
    gap: Spacing.lg,
    overflow: "hidden",
  },
  packTopRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  packIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  packLevel: {
    color: Colors.gold[300],
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  packTitle: { color: "#fff", fontSize: FontSize.xl, fontWeight: FontWeight.bold, marginTop: 3 },
  readyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: "rgba(16,185,129,0.15)",
  },
  readyText: { color: "#6EE7B7", fontSize: 9, fontWeight: FontWeight.bold },
  packDescription: { color: "rgba(255,255,255,0.72)", fontSize: FontSize.sm, lineHeight: 20 },
  factRow: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingVertical: Spacing.md,
  },
  fact: { flex: 1, alignItems: "center", gap: 2 },
  factValue: { color: "#fff", fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  factLabel: { color: "rgba(255,255,255,0.55)", fontSize: 9 },
  downloadButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary[500],
  },
  downloadText: { color: "#fff", fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  installedActions: { flexDirection: "row", gap: Spacing.sm },
  startButton: {
    minHeight: 52,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary[500],
  },
  startText: { color: "#fff", fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  removeButton: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(239,68,68,0.14)",
  },
  webNotice: {
    color: Colors.dark.textSecondary,
    textAlign: "center",
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  progressCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: "rgba(0,0,0,0.2)",
    gap: Spacing.sm,
  },
  progressTop: { flexDirection: "row", justifyContent: "space-between" },
  progressTitle: { color: "#fff", fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  progressMeta: { color: Colors.primary[200], fontSize: FontSize.xs },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  progressFill: { height: 7, borderRadius: 4, backgroundColor: Colors.primary[300] },
  progressFile: { color: "rgba(255,255,255,0.55)", fontSize: 9 },
  sectionHeading: { marginTop: Spacing.sm, gap: 3 },
  sectionTitle: { color: Colors.dark.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  sectionSubtitle: { color: Colors.dark.textSecondary, fontSize: FontSize.xs, lineHeight: 18 },
  pdfCard: {
    minHeight: 128,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.card,
    padding: Spacing.lg,
  },
  pdfIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  pdfCopy: { flex: 1, gap: 4 },
  pdfTitle: { color: Colors.dark.text, fontSize: FontSize.base, fontWeight: FontWeight.bold },
  pdfSubtitle: { color: Colors.dark.textMuted, fontSize: FontSize.xs },
  pdfActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
  pdfAction: {
    minHeight: 40,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: BorderRadius.md,
    backgroundColor: `${Colors.primary[500]}18`,
  },
  pdfActionText: { color: Colors.primary[300], fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  lockedNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: `${Colors.gold[500]}12`,
  },
  lockedText: { flex: 1, color: Colors.dark.textSecondary, fontSize: FontSize.xs, lineHeight: 18 },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.dark.card,
  },
  infoText: { flex: 1, color: Colors.dark.textSecondary, fontSize: FontSize.xs, lineHeight: 18 },
});
