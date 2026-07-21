#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execPnpmSync } = require("./pnpm-process");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_FILE = path.join(ROOT, "packages", "database", "src", "supabase.types.ts");
const PROJECT_ID = "teylstfbjtutssnfmhhu";
const useLocal = process.argv.includes("--local");
const useLinked = process.argv.includes("--linked");
const checkOnly = process.argv.includes("--check");

const sourceArgs = useLocal ? ["--local"] : useLinked ? ["--linked"] : ["--project-id", PROJECT_ID];
const args = [
  "exec",
  "supabase",
  "gen",
  "types",
  "--lang",
  "typescript",
  ...sourceArgs,
  "--schema",
  "public",
];

function generate() {
  let output;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      output = execPnpmSync(args, {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      break;
    } catch (error) {
      const details = `${error.stderr ?? ""}\n${error.stdout ?? ""}\n${error.message ?? ""}`;
      const transientContainerFailure =
        /too\s*many\s*requests|rate exceeded|tls handshake timeout|connection reset/i.test(details);
      if (!transientContainerFailure || attempt === 3) throw error;

      const delayMs = attempt * 2_000;
      console.warn(
        `Supabase type generation hit a transient container error; retrying in ${delayMs}ms.`
      );
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
    }
  }

  if (!output?.includes("export type Database")) {
    throw new Error("Supabase CLI returned output that does not look like TypeScript types.");
  }

  return output;
}

function normalizeTypes(output) {
  const metadataStart = output.indexOf("\n  // Allows to automatically instantiate createClient");
  const publicSchemaStart = output.indexOf("\n  public:", metadataStart);

  if (metadataStart === -1 || publicSchemaStart === -1) return output;

  return output.slice(0, metadataStart) + output.slice(publicSchemaStart);
}

async function formatTypes(output) {
  const prettier = await import("prettier");
  return prettier.format(normalizeTypes(output), { filepath: OUTPUT_FILE });
}

async function main() {
  try {
    const output = await formatTypes(generate());

    if (!checkOnly) {
      fs.writeFileSync(OUTPUT_FILE, output, "utf8");
      console.log(`Generated ${path.relative(ROOT, OUTPUT_FILE)}`);
      return;
    }

    const committed = await formatTypes(fs.readFileSync(OUTPUT_FILE, "utf8"));
    if (committed !== output) {
      console.error("Supabase database types have drifted.");
      console.error("Run `pnpm db:types` (linked) or `pnpm db:types:local` and commit the result.");
      process.exit(1);
    }

    console.log("Supabase database types are current.");
  } catch (error) {
    const message =
      error.stderr?.toString().trim() || error.stdout?.toString().trim() || error.message;
    console.error(
      checkOnly ? "Failed to verify Supabase types." : "Failed to generate Supabase types."
    );
    console.error(message);
    process.exit(1);
  }
}

void main();
