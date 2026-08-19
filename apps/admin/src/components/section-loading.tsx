import { getAdminSection, type AdminSectionKey } from "@/lib/admin-sections";
import { SkeletonScreen, SkeletonTable } from "@/components/skeleton";

/**
 * Shared body for every section route's `loading.tsx`. The column count comes
 * from the section definition rather than a hard-coded number, so a skeleton
 * cannot drift out of shape when a section's field list changes.
 */
export function SectionLoading({
  sectionKey,
  rows = 8,
}: {
  sectionKey: AdminSectionKey;
  rows?: number;
}) {
  const section = getAdminSection(sectionKey);
  /* +1 for the ID column; capped so the widest tables still read as bars. */
  const columns = Math.min((section?.fields.length ?? 4) + 1, 7);

  return (
    <SkeletonScreen label={`Loading ${section?.label ?? "section"}`}>
      <SkeletonTable rows={rows} columns={columns} />
    </SkeletonScreen>
  );
}
