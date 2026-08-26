import { ADMIN_SECTIONS } from "@/lib/admin-sections";
import { SkeletonCards, SkeletonHero, SkeletonScreen, SkeletonTable } from "@/components/skeleton";

/**
 * The overview queries every section table at once, so it is the slowest page
 * in the console and the one that most needs a skeleton.
 */
export default function AdminHomeLoading() {
  return (
    <SkeletonScreen label="Loading admin overview">
      <SkeletonHero />
      <SkeletonCards count={ADMIN_SECTIONS.length} />
      {ADMIN_SECTIONS.slice(0, 3).map((section) => (
        <SkeletonTable
          key={section.key}
          rows={5}
          columns={Math.min(section.fields.length + 1, 7)}
        />
      ))}
    </SkeletonScreen>
  );
}
