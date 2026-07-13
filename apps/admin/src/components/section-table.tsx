import Link from "next/link";
import { formatCell, getRowId, type SectionResult } from "@/lib/admin-data";

export function SectionTable({
  result,
  compact = false,
}: {
  result: SectionResult;
  compact?: boolean;
}) {
  const { section, rows, error } = result;
  const visibleRows = compact ? rows.slice(0, 5) : rows;

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{section.table}</p>
          <h2>{section.label}</h2>
          <p>{section.description}</p>
        </div>
        {compact && (
          <Link className="secondary-button" href={`/${section.key}`}>
            Open
          </Link>
        )}
      </div>

      {error ? (
        <div className="empty-state">
          <strong>Could not load this section.</strong>
          <span>{error}</span>
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="empty-state">
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
                  <th key={field}>{field.replaceAll("_", " ")}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={getRowId(row, index)}>
                  <td className="mono">{formatCell(row.id)}</td>
                  {section.fields.map((field) => (
                    <td key={field}>{formatCell(row[field])}</td>
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
