import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as Linking from "expo-linking";
import { SITE_URL } from "@/constants/links";

export type ExamPackAssetRole = "content" | "audio" | "test-paper" | "answer-key";

export type ExamPackAsset = {
  path: string;
  role: ExamPackAssetRole;
  bytes: number;
  md5: string;
};

export type ExamPackManifest = {
  schemaVersion: 1;
  id: string;
  version: number;
  level: "N5";
  title: string;
  description: string;
  questionCount: number;
  listeningTrackCount: number;
  totalBytes: number;
  publishedAt: string;
  assets: ExamPackAsset[];
};

export type InstalledExamPack = {
  manifest: ExamPackManifest;
  directoryUri: string;
};

export type ExamPackProgress = {
  completedFiles: number;
  totalFiles: number;
  downloadedBytes: number;
  totalBytes: number;
  currentFile: string;
};

export type PrintablePdfKind = "test-paper" | "answer-key";

const PACK_ID = "jgl-n5-mock-1";
const PACK_VERSION = 3;
const DISTRIBUTION_ROOT = (
  process.env.EXPO_PUBLIC_EXAM_ASSET_BASE_URL ?? `${SITE_URL}/exam-packs`
).replace(/\/$/, "");
const PACK_REMOTE_DIRECTORY = `${DISTRIBUTION_ROOT}/n5-mock-1/v${PACK_VERSION}`;
const PACK_DIRECTORY_NAME = `${PACK_ID}-v${PACK_VERSION}`;
const PAPER_FILENAME = "japangolearn-n5-mock-1-test-paper.pdf";
const ANSWER_FILENAME = "japangolearn-n5-mock-1-answer-key.pdf";

export const N5_OFFLINE_PACK = {
  id: PACK_ID,
  version: PACK_VERSION,
  title: "N5 Mock 1 Complete Pack",
  description: "Questions, 20 listening tracks, printable paper, and answer key.",
  level: "N5" as const,
  questionCount: 36,
  listeningTrackCount: 20,
  estimatedBytes: 1_453_574,
  remoteDirectory: PACK_REMOTE_DIRECTORY,
};

function packsRoot(): Directory {
  return new Directory(Paths.document, "exam-packs");
}

function installedDirectory(): Directory {
  return new Directory(packsRoot(), PACK_DIRECTORY_NAME);
}

function parseManifest(value: unknown): ExamPackManifest {
  if (!value || typeof value !== "object") throw new Error("The pack manifest is invalid.");
  const manifest = value as Partial<ExamPackManifest>;
  if (
    manifest.schemaVersion !== 1 ||
    manifest.id !== PACK_ID ||
    manifest.version !== PACK_VERSION ||
    manifest.level !== "N5" ||
    !Array.isArray(manifest.assets) ||
    typeof manifest.totalBytes !== "number" ||
    typeof manifest.title !== "string"
  ) {
    throw new Error("This pack version is not compatible with the app.");
  }
  for (const asset of manifest.assets) {
    if (
      !asset ||
      typeof asset.path !== "string" ||
      asset.path.includes("..") ||
      asset.path.startsWith("/") ||
      typeof asset.bytes !== "number" ||
      typeof asset.md5 !== "string"
    ) {
      throw new Error("The pack contains an unsafe or invalid asset entry.");
    }
  }
  return manifest as ExamPackManifest;
}

function fileForRelativePath(root: Directory, relativePath: string): File {
  const parts = relativePath.split("/");
  const filename = parts.pop();
  if (!filename) throw new Error("The pack contains an invalid file path.");
  let directory = root;
  for (const part of parts) {
    directory = new Directory(directory, part);
    directory.create({ idempotent: true, intermediates: true });
  }
  return new File(directory, filename);
}

function remoteUrl(relativePath: string): string {
  return `${PACK_REMOTE_DIRECTORY}/${relativePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}

function pdfRelativePath(kind: PrintablePdfKind): string {
  return `pdf/${kind === "test-paper" ? PAPER_FILENAME : ANSWER_FILENAME}`;
}

function friendlyError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (/network|download|status code|unable/i.test(message)) {
    return new Error("The pack could not be downloaded. Check your connection and try again.");
  }
  return error instanceof Error ? error : new Error("The pack could not be installed.");
}

export async function getInstalledExamPack(): Promise<InstalledExamPack | null> {
  if (Platform.OS === "web") return null;
  try {
    const directory = installedDirectory();
    const manifestFile = new File(directory, "manifest.json");
    if (!directory.exists || !manifestFile.exists) return null;
    const manifest = parseManifest(JSON.parse(await manifestFile.text()));
    const missingAsset = manifest.assets.some(
      (asset) => !new File(directory, ...asset.path.split("/")).exists
    );
    if (missingAsset) return null;
    return { manifest, directoryUri: directory.uri };
  } catch {
    return null;
  }
}

export async function installExamPack(
  onProgress?: (progress: ExamPackProgress) => void
): Promise<InstalledExamPack> {
  if (Platform.OS === "web") {
    throw new Error("Offline pack installation is available in the Android and iOS apps.");
  }

  const root = packsRoot();
  root.create({ idempotent: true, intermediates: true });
  const staging = new Directory(root, `${PACK_DIRECTORY_NAME}.staging`);
  if (staging.exists) staging.delete();
  staging.create({ intermediates: true });

  try {
    const manifestFile = new File(staging, "manifest.json");
    await File.downloadFileAsync(remoteUrl("manifest.json"), manifestFile, { idempotent: true });
    const manifest = parseManifest(JSON.parse(await manifestFile.text()));
    if (Paths.availableDiskSpace < manifest.totalBytes * 1.25) {
      throw new Error("There is not enough free storage to install this pack.");
    }

    let downloadedBytes = 0;
    for (let index = 0; index < manifest.assets.length; index += 1) {
      const asset = manifest.assets[index];
      onProgress?.({
        completedFiles: index,
        totalFiles: manifest.assets.length,
        downloadedBytes,
        totalBytes: manifest.totalBytes,
        currentFile: asset.path,
      });
      const destination = fileForRelativePath(staging, asset.path);
      await File.downloadFileAsync(remoteUrl(asset.path), destination, { idempotent: true });
      const info = destination.info({ md5: true });
      if (info.size !== asset.bytes || info.md5?.toLowerCase() !== asset.md5.toLowerCase()) {
        throw new Error(`Integrity check failed for ${asset.path}.`);
      }
      downloadedBytes += asset.bytes;
    }

    const installed = installedDirectory();
    if (installed.exists) installed.delete();
    await staging.move(installed);
    onProgress?.({
      completedFiles: manifest.assets.length,
      totalFiles: manifest.assets.length,
      downloadedBytes: manifest.totalBytes,
      totalBytes: manifest.totalBytes,
      currentFile: "Complete",
    });
    return { manifest, directoryUri: installed.uri };
  } catch (error) {
    if (staging.exists) staging.delete();
    throw friendlyError(error);
  }
}

export async function removeExamPack(): Promise<void> {
  if (Platform.OS === "web") return;
  const directory = installedDirectory();
  if (directory.exists) directory.delete();
}

export async function getInstalledListeningAudioUri(questionId: string): Promise<string | null> {
  if (!/^n5m1-l\d{2}$/.test(questionId)) return null;
  const installed = await getInstalledExamPack();
  if (!installed) return null;
  const file = new File(installed.directoryUri, "audio", `${questionId}.mp3`);
  return file.exists ? file.uri : null;
}

export function getRemotePdfUrl(kind: PrintablePdfKind): string {
  return remoteUrl(pdfRelativePath(kind));
}

export async function getInstalledPdfUri(kind: PrintablePdfKind): Promise<string | null> {
  const installed = await getInstalledExamPack();
  if (!installed) return null;
  const file = new File(installed.directoryUri, ...pdfRelativePath(kind).split("/"));
  return file.exists ? file.uri : null;
}

export async function printExamPackPdf(kind: PrintablePdfKind): Promise<void> {
  if (Platform.OS === "web") {
    await Linking.openURL(getRemotePdfUrl(kind));
    return;
  }
  const uri = await getInstalledPdfUri(kind);
  if (!uri) throw new Error("Download this pack before printing its PDF.");
  await Print.printAsync({ uri });
}

export async function shareExamPackPdf(kind: PrintablePdfKind): Promise<void> {
  if (Platform.OS === "web") {
    await Linking.openURL(getRemotePdfUrl(kind));
    return;
  }
  const uri = await getInstalledPdfUri(kind);
  if (!uri) throw new Error("Download this pack before sharing its PDF.");
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("Sharing is not available on this device.");
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: kind === "test-paper" ? "Share printable test paper" : "Share answer key",
  });
}

export function formatPackSize(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
