import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const contentSource = path.join(repositoryRoot, "apps/mobile/lib/exam-content.ts");
const scratchDirectory = path.join(repositoryRoot, "tmp/pdfs");
const contentOutput = path.join(scratchDirectory, "n5-mock-1-data.json");
const finalPdfDirectory = path.join(repositoryRoot, "output/pdf");
const publicPackDirectory = path.join(repositoryRoot, "apps/web/public/exam-packs/n5-mock-1/v3");
const audioSourceDirectory = path.join(repositoryRoot, "apps/mobile/assets/audio/n5-mock-1");

async function loadExamDefinition() {
  const result = await build({
    entryPoints: [contentSource],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    target: "node20",
  });
  const bundledModule = result.outputFiles[0]?.text;
  if (!bundledModule) throw new Error("Exam content bundle was empty.");
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundledModule).toString("base64")}`;
  const module = await import(moduleUrl);
  return module.N5_MOCK_1;
}

async function assetRecord(root, relativePath, role) {
  const absolutePath = path.join(root, relativePath);
  const bytes = await readFile(absolutePath);
  return {
    path: relativePath.replaceAll("\\", "/"),
    role,
    bytes: (await stat(absolutePath)).size,
    md5: createHash("md5").update(bytes).digest("hex"),
  };
}

const exam = await loadExamDefinition();
await mkdir(scratchDirectory, { recursive: true });
await writeFile(contentOutput, `${JSON.stringify(exam, null, 2)}\n`, "utf8");

const paperName = "japangolearn-n5-mock-1-test-paper.pdf";
const answersName = "japangolearn-n5-mock-1-answer-key.pdf";
const paperSource = path.join(finalPdfDirectory, paperName);
const answersSource = path.join(finalPdfDirectory, answersName);

if (!existsSync(paperSource) || !existsSync(answersSource)) {
  console.log(
    `Exam data written to ${contentOutput}. Generate both PDFs, then run this script again.`
  );
  process.exit(0);
}

const resolvedPublicRoot = path.resolve(publicPackDirectory);
if (
  !resolvedPublicRoot.startsWith(
    path.resolve(repositoryRoot, "apps/web/public/exam-packs") + path.sep
  )
) {
  throw new Error("Refusing to rebuild a pack outside apps/web/public/exam-packs.");
}
await rm(resolvedPublicRoot, { recursive: true, force: true });
await mkdir(path.join(resolvedPublicRoot, "audio"), { recursive: true });
await mkdir(path.join(resolvedPublicRoot, "pdf"), { recursive: true });

const packPayload = {
  schemaVersion: 1,
  packId: exam.id,
  packVersion: 3,
  generatedAt: "2026-09-22",
  exam,
};
await writeFile(
  path.join(resolvedPublicRoot, "pack.json"),
  `${JSON.stringify(packPayload, null, 2)}\n`,
  "utf8"
);

for (const question of exam.sections.flatMap((section) => section.questions)) {
  if (!question.audioScript) continue;
  await copyFile(
    path.join(audioSourceDirectory, `${question.id}.mp3`),
    path.join(resolvedPublicRoot, "audio", `${question.id}.mp3`)
  );
}
await copyFile(paperSource, path.join(resolvedPublicRoot, "pdf", paperName));
await copyFile(answersSource, path.join(resolvedPublicRoot, "pdf", answersName));

const assets = [
  await assetRecord(resolvedPublicRoot, "pack.json", "content"),
  ...(await Promise.all(
    exam.sections
      .flatMap((section) => section.questions)
      .filter((question) => question.audioScript)
      .map((question) => assetRecord(resolvedPublicRoot, `audio/${question.id}.mp3`, "audio"))
  )),
  await assetRecord(resolvedPublicRoot, `pdf/${paperName}`, "test-paper"),
  await assetRecord(resolvedPublicRoot, `pdf/${answersName}`, "answer-key"),
];
const manifest = {
  schemaVersion: 1,
  id: exam.id,
  version: 3,
  level: exam.level,
  title: `${exam.title} Offline Pack`,
  description: "36 original questions, 20 listening tracks, and two printable PDFs.",
  questionCount: exam.sections.reduce((total, section) => total + section.questions.length, 0),
  listeningTrackCount: assets.filter((asset) => asset.role === "audio").length,
  totalBytes: assets.reduce((total, asset) => total + asset.bytes, 0),
  publishedAt: "2026-09-22",
  assets,
};
await writeFile(
  path.join(resolvedPublicRoot, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);

console.log(
  `Built ${manifest.title} (${manifest.assets.length} files, ${manifest.totalBytes} bytes).`
);
