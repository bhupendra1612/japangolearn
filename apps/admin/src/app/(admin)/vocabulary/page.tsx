import { SectionTable } from "@/components/section-table";
import { getSectionResult } from "@/lib/admin-data";
import { getAdminSection } from "@/lib/admin-sections";
import { requireAdmin } from "@/lib/auth";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function VocabularyPage() {
  const { supabase } = await requireAdmin();
  const section = getAdminSection("vocabulary");
  if (!section) notFound();
  const result = await getSectionResult(supabase, section, 100);

  return <SectionTable result={result} />;
}
