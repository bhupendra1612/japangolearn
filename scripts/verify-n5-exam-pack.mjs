import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const packRoot = path.join(root, "apps/web/public/exam-packs/n5-mock-1/v3");
const manifest = JSON.parse(await readFile(path.join(packRoot, "manifest.json"), "utf8"));

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.id, "jgl-n5-mock-1");
assert.equal(manifest.version, 3);
assert.equal(manifest.questionCount, 36);
assert.equal(manifest.listeningTrackCount, 20);
assert.equal(manifest.assets.length, 23);

let totalBytes = 0;
for (const asset of manifest.assets) {
  assert.ok(!asset.path.includes("..") && !path.isAbsolute(asset.path));
  const filePath = path.join(packRoot, asset.path);
  const bytes = await readFile(filePath);
  assert.equal((await stat(filePath)).size, asset.bytes, `${asset.path} size`);
  assert.equal(createHash("md5").update(bytes).digest("hex"), asset.md5, `${asset.path} md5`);
  totalBytes += asset.bytes;
}
assert.equal(totalBytes, manifest.totalBytes);

const payload = JSON.parse(await readFile(path.join(packRoot, "pack.json"), "utf8"));
assert.equal(payload.packId, manifest.id);
assert.equal(payload.packVersion, manifest.version);
assert.equal(payload.exam.sections.length, 3);
assert.equal(
  payload.exam.sections.reduce((total, section) => total + section.questions.length, 0),
  manifest.questionCount
);
assert.equal(
  payload.exam.sections
    .flatMap((section) => section.questions)
    .filter((question) => question.audioScript).length,
  manifest.listeningTrackCount
);

console.log(
  `Verified ${manifest.title}: ${manifest.assets.length} files, ${manifest.totalBytes} bytes.`
);
