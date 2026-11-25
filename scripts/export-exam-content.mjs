import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const entryPoint = path.join(repositoryRoot, "apps/mobile/lib/exam-content.ts");
const outputPath = path.resolve(process.argv[2] ?? path.join(repositoryRoot, "tmp/exam-content.json"));

const result = await build({
  entryPoints: [entryPoint],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  target: "node20",
});
const bundledModule = result.outputFiles[0]?.text;
if (!bundledModule) throw new Error("Exam content bundle was empty.");

const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundledModule).toString("base64")}`;
const examModule = await import(moduleUrl);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(examModule.N5_MOCKS, null, 2)}\n`, "utf8");
console.log(`Exported ${examModule.N5_MOCKS.length} exam sets to ${outputPath}`);
