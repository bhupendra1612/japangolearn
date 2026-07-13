import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_SECTIONS, type AdminSection } from "@/lib/admin-sections";

export type AdminRow = Record<string, unknown>;

export type SectionResult = {
  section: AdminSection;
  count: number | null;
  rows: AdminRow[];
  error: string | null;
};

export async function getSectionResult(
  supabase: SupabaseClient,
  section: AdminSection,
  limit = 50
): Promise<SectionResult> {
  const [{ count, error: countError }, { data, error }] = await Promise.all([
    supabase.from(section.table).select("*", { count: "exact", head: true }),
    supabase.from(section.table).select("*").limit(limit),
  ]);

  return {
    section,
    count: count ?? null,
    rows: (data ?? []) as AdminRow[],
    error: error?.message ?? countError?.message ?? null,
  };
}

export async function getAllSectionResults(supabase: SupabaseClient) {
  return Promise.all(ADMIN_SECTIONS.map((section) => getSectionResult(supabase, section, 8)));
}

export function formatCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function getRowId(row: AdminRow, fallback: number) {
  const id = row.id;
  if (typeof id === "string" || typeof id === "number") return String(id);
  return String(fallback);
}
