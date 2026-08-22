import type { CSSProperties } from "react";

/**
 * Loading placeholders for the admin console.
 *
 * Every admin page is `force-dynamic` and blocks on a Supabase round trip, so
 * without these a nav click leaves the previous page frozen on screen. The
 * shapes deliberately mirror the real components they stand in for — same
 * panel, same padding, same column count — so the swap does not jump.
 *
 * All of them are decorative: the live region announcing "Loading" belongs on
 * the page-level wrapper, not on each bar.
 */

export function Skeleton({
  width = "100%",
  height = 12,
  radius,
  className = "",
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{
        display: "block",
        width,
        height,
        ...(radius === undefined ? {} : { borderRadius: radius }),
        ...style,
      }}
    />
  );
}

/** Wraps a whole loading screen and announces it to assistive technology. */
export function SkeletonScreen({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="stack" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function SkeletonMetrics({ count = 3 }: { count?: number }) {
  return (
    <div className="metrics-grid">
      {Array.from({ length: count }, (_, index) => (
        <div className="metric" key={index}>
          <Skeleton width={56} height={26} />
          <Skeleton width={74} height={11} style={{ marginTop: 10 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 7 }: { count?: number }) {
  return (
    <div className="cards-grid">
      {Array.from({ length: count }, (_, index) => (
        <div className="stat-card" key={index}>
          <div className="stat-card-top">
            <Skeleton width={72} height={12} />
            <Skeleton width={34} height={34} radius={8} />
          </div>
          <Skeleton width={54} height={26} style={{ margin: "12px 0 6px" }} />
          <Skeleton width={90} height={11} />
        </div>
      ))}
    </div>
  );
}

/**
 * Stands in for a <SectionTable>. `columns` drives the bar widths so a wide
 * table does not collapse into three lonely bars while it loads.
 */
export function SkeletonTable({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  /* Uneven widths read as data; identical widths read as a broken grid. */
  const widths = ["24%", "18%", "14%", "20%", "16%", "12%", "22%"];

  return (
    <section className="panel">
      <div className="section-heading">
        <div className="section-heading-main">
          <Skeleton width={36} height={36} radius={8} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <Skeleton width={70} height={10} />
            <Skeleton width={130} height={18} style={{ margin: "8px 0 8px" }} />
            <Skeleton width="min(420px, 90%)" height={11} />
          </div>
        </div>
        <Skeleton width={58} height={26} radius={999} />
      </div>

      <div>
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div className="skeleton-row" key={rowIndex}>
            {Array.from({ length: columns }, (_, columnIndex) => (
              <Skeleton key={columnIndex} width={widths[columnIndex % widths.length]} height={11} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function SkeletonHero() {
  return (
    <section className="hero-panel">
      <div>
        <Skeleton width={78} height={10} />
        <Skeleton width="min(360px, 80%)" height={24} style={{ margin: "10px 0 10px" }} />
        <Skeleton width="min(520px, 100%)" height={12} />
        <Skeleton width="min(420px, 86%)" height={12} style={{ marginTop: 8 }} />
      </div>
      <SkeletonMetrics />
    </section>
  );
}
