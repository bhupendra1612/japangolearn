import Link from "next/link";
import { SectionTable } from "@/components/section-table";
import { SectionIcon } from "@/components/section-icons";
import { getAllSectionResults } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const { supabase } = await requireAdmin();
  const results = await getAllSectionResults(supabase);
  const loadedSections = results.filter((result) => !result.error);
  const totalRecords = loadedSections.reduce(
    (sum, result) => sum + (result.count ?? result.rows.length),
    0
  );

  return (
    <div className="stack">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Learning platform control room</h2>
          <p>
            Review users, Japanese content, publishing queues, and contact submissions from the
            dedicated admin app.
          </p>
        </div>
        <div className="metrics-grid">
          <Metric label="Sections" value={results.length} />
          <Metric label="Loaded" value={loadedSections.length} />
          <Metric label="Records" value={totalRecords} />
        </div>
      </section>

      <div className="cards-grid">
        {results.map((result) => (
          <Link className="stat-card" href={`/${result.section.key}`} key={result.section.key}>
            <div className="stat-card-top">
              <span>{result.section.label}</span>
              <span className="stat-icon">
                <SectionIcon sectionKey={result.section.key} size={17} />
              </span>
            </div>
            <strong>
              {result.error ? "—" : (result.count ?? result.rows.length).toLocaleString("en-IN")}
            </strong>
            <small>{result.error ? "Failed to load" : result.section.table}</small>
          </Link>
        ))}
      </div>

      <div className="stack">
        {results.map((result) => (
          <SectionTable key={result.section.key} result={result} compact />
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <strong>{value.toLocaleString("en-IN")}</strong>
      <span>{label}</span>
    </div>
  );
}
