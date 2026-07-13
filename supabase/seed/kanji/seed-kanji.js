#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.resolve(__dirname, "../../..");
const DATA_FILE = path.join(__dirname, "n5-remaining.json");
const PROJECT_URL = "https://teylstfbjtutssnfmhhu.supabase.co";

const ENV_FILES = [
  ".env.local",
  ".env",
  path.join("apps", "admin", ".env.local"),
  path.join("apps", "web", ".env.local"),
  path.join("apps", "mobile", ".env.local"),
];

for (const relativePath of ENV_FILES) {
  loadEnvFile(path.join(ROOT, relativePath));
}

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  PROJECT_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or key. Check .env.local or app env files.");
  process.exit(1);
}

if (!fs.existsSync(DATA_FILE)) {
  console.error(`Seed data not found: ${DATA_FILE}`);
  process.exit(1);
}

const kanjiList = readKanjiSeed(DATA_FILE);
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

seed().catch((error) => {
  console.error("Unexpected seed failure:", error);
  process.exit(1);
});

async function seed() {
  const batchSize = 10;
  let written = 0;
  let failed = 0;

  console.log(`Seeding ${kanjiList.length} kanji records...`);

  for (let index = 0; index < kanjiList.length; index += batchSize) {
    const batch = kanjiList.slice(index, index + batchSize);
    const rows = batch.map(toKanjiRow);
    const { error } = await supabase
      .from("kanji")
      .upsert(rows, { onConflict: "character", ignoreDuplicates: false });

    if (error) {
      failed += rows.length;
      console.error(`Batch ${index / batchSize + 1} failed: ${error.message}`);
      continue;
    }

    written += rows.length;
    console.log(`Batch ${index / batchSize + 1}: ${batch.map((k) => k.kanji).join(" ")}`);
  }

  console.log(`Done. Written: ${written}. Failed: ${failed}.`);
  if (failed > 0) process.exitCode = 1;
}

function readKanjiSeed(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const merged = raw.trim().replace(/\]\s*\n\s*\[/g, ",");
  const parsed = JSON.parse(merged);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Kanji seed file must contain a non-empty JSON array.");
  }

  return parsed;
}

function toKanjiRow(source) {
  return {
    character: source.kanji,
    hiragana: source.hiragana,
    romaji: source.romaji,
    hindi_pronunciation: source.hindi_pronunciation,
    meaning_en: source.meaning_en ?? [],
    meaning_hi: source.meaning_hi ?? [],
    stroke_count: source.stroke_count,
    radical: source.radical,
    jlpt_level: source.jlpt_level ?? "N5",
    order_index: source.order_index,
    frequency_rank: source.frequency_rank,
    mnemonic: source.mnemonic,
    writing_tip: source.writing_tip,
    confusable_kanji: source.confusable_kanji ?? [],
    image_url: source.image_url ?? null,
    icon: source.icon ?? null,
    tags: source.tags ?? [],
    kunyomi: source.kunyomi ?? [],
    onyomi: source.onyomi ?? [],
    vocabulary: source.vocabulary ?? [],
    example_sentences: source.examples ?? source.example_sentences ?? [],
    related_kanji: source.related_kanji ?? [],
  };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}
