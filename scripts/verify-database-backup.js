#!/usr/bin/env node
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { execPnpmSync } = require("./pnpm-process");

const ROOT = path.resolve(__dirname, "..");
const LOG_DIR = path.join(ROOT, ".logs");
const SCHEMA_BACKUP = path.join(LOG_DIR, "database-schema-backup.sql");
const DATA_BACKUP = path.join(LOG_DIR, "database-data-backup.sql");
const CONTAINER = "supabase_db_japangolearn";
const RESTORE_DB = "jgl_restore_verification";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} failed`);
  }
  return result.stdout;
}

function supabase(args) {
  execPnpmSync(["exec", "supabase", ...args], {
    cwd: ROOT,
    stdio: "inherit",
  });
}

fs.mkdirSync(LOG_DIR, { recursive: true });

try {
  supabase(["db", "dump", "--local", "--schema", "public,private", "--file", SCHEMA_BACKUP]);
  supabase(["db", "dump", "--local", "--schema", "public", "--data-only", "--file", DATA_BACKUP]);

  const schemaSql = fs.readFileSync(SCHEMA_BACKUP, "utf8");
  if (!schemaSql.includes("CREATE TABLE") || !schemaSql.includes("learning_attempts")) {
    throw new Error("Schema backup is incomplete.");
  }

  run("docker", ["exec", CONTAINER, "dropdb", "-U", "postgres", "--if-exists", RESTORE_DB]);
  run("docker", ["exec", CONTAINER, "createdb", "-U", "postgres", RESTORE_DB]);
  run("docker", [
    "exec",
    CONTAINER,
    "psql",
    "-U",
    "postgres",
    "-d",
    RESTORE_DB,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    "create schema if not exists auth; create table if not exists auth.users (id uuid primary key); create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$; create schema if not exists extensions; create extension if not exists pgcrypto with schema extensions;",
  ]);

  run(
    "docker",
    ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", RESTORE_DB, "-v", "ON_ERROR_STOP=1"],
    { input: schemaSql }
  );
  run(
    "docker",
    ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", RESTORE_DB, "-v", "ON_ERROR_STOP=1"],
    {
      input: [
        "set session_replication_role = replica;",
        fs.readFileSync(DATA_BACKUP, "utf8"),
        "set session_replication_role = origin;",
      ].join("\n"),
    }
  );

  const verification = run("docker", [
    "exec",
    CONTAINER,
    "psql",
    "-U",
    "postgres",
    "-d",
    RESTORE_DB,
    "-At",
    "-c",
    "select count(*) from information_schema.tables where table_schema='public' and table_name in ('profiles','learning_attempts','xp_ledger','daily_quest_completions');",
  ]).trim();

  if (verification !== "4") throw new Error("Restored backup is missing required tables.");
  console.log("Database schema and data backup restored successfully in an isolated database.");
} finally {
  try {
    run("docker", ["exec", CONTAINER, "dropdb", "-U", "postgres", "--if-exists", RESTORE_DB]);
  } catch {
    // Preserve the original verification error.
  }
}
