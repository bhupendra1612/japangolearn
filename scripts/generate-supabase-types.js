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
  const output = execPnpmSync(args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (!output.includes("export type Database")) {
    throw new Error("Supabase CLI returned output that does not look like TypeScript types.");
  }

  return output;
}

async function formatTypes(output) {
  const prettier = await import("prettier");
  return prettier.format(output, { filepath: OUTPUT_FILE });
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
