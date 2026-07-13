#!/usr/bin/env node
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_FILE = path.join(ROOT, "packages", "database", "src", "supabase.types.ts");
const PROJECT_ID = "teylstfbjtutssnfmhhu";
const SUPABASE_ARGS = [
  "gen",
  "types",
  "typescript",
  "--project-id",
  PROJECT_ID,
  "--schema",
  "public",
];

try {
  const command = process.platform === "win32" ? "cmd.exe" : "supabase";
  const args =
    process.platform === "win32"
      ? ["/c", "pnpm", "exec", "supabase", ...SUPABASE_ARGS]
      : SUPABASE_ARGS;

  const output = execFileSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (!output.includes("export type Database")) {
    throw new Error("Supabase CLI returned output that does not look like TypeScript types.");
  }

  fs.writeFileSync(OUTPUT_FILE, output, "utf8");
  console.log(`Generated ${path.relative(ROOT, OUTPUT_FILE)}`);
} catch (error) {
  const message =
    error.stderr?.toString().trim() || error.stdout?.toString().trim() || error.message;
  console.error("Failed to generate Supabase types.");
  console.error(message);
  process.exit(1);
}
