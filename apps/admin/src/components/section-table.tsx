import Link from "next/link";
import { AlertTriangle, ArrowRight, Inbox } from "lucide-react";
import { formatCell, getRowId, type SectionResult } from "@/lib/admin-data";
import { SectionIcon } from "@/components/section-icons";

/** "jlpt_level" -> "jlpt level", used for headers and mobile row labels. */
function humanise(field: string) {
  return field.replaceAll("_", " ");
}

export function SectionTable({
  result,
  compact = false,
}: {
  result: SectionResult;
  compact?: boolean;
}) {
  const { section, rows, count, error } = result;
  const visibleRows = compact ? rows.slice(0, 5) : rows;
  const total = count ?? rows.length;

  return (
    <section className="panel">
      <div className="section-heading">
        <div className="section-heading-main">
          <span className="section-icon">
            <SectionIcon sectionKey={section.key} />
          </span>
          <div style={{ minWidth: 0 }}>
            <p className="eyebrow">{section.table}</p>
            <h2>{section.label}</h2>
            <p>{section.description}</p>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          {!error && <span className="row-count">{total.toLocaleString("en-IN")} records</span>}
          {compact && (
            <Link className="secondary-button" href={`/${section.key}`}>
              Open
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      {error ? (
        <div className="empty-state">
          <AlertTriangle aria-hidden="true" />
          <strong>Could not load this section.</strong>
          <span>{error}</span>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="empty-state">
          <Inbox aria-hidden="true" />
          <strong>No records yet.</strong>
          <span>This table is reachable but currently empty.</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                {section.fields.map((field) => (
                  <th key={field}>{humanise(field)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={getRowId(row, index)}>
                  {/* data-label feeds the stacked-card layout below 760px, where
                      the header row is hidden and each cell prints its own. */}
                  <td className="mono" data-label="ID">
                    {formatCell(row.id)}
                  </td>
                  {section.fields.map((field) => (
                    <td key={field} data-label={humanise(field)}>
                      {formatCell(row[field])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
