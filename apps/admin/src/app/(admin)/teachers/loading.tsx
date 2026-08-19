import { Skeleton, SkeletonScreen } from "@/components/skeleton";

/**
 * Teacher approvals renders review cards rather than a table, so it gets its
 * own skeleton shape instead of reusing SectionLoading.
 */
export default function TeachersLoading() {
  return (
    <SkeletonScreen label="Loading teacher approvals">
      <section className="panel">
        <div className="section-heading">
          <div className="section-heading-main">
            <Skeleton width={36} height={36} radius={8} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <Skeleton width={92} height={10} />
              <Skeleton width={168} height={18} style={{ margin: "8px 0 8px" }} />
              <Skeleton width="min(420px, 90%)" height={11} />
            </div>
          </div>
        </div>

        <div className="teacher-review-list">
          {Array.from({ length: 3 }, (_, index) => (
            <article className="teacher-review-card" key={index}>
              <div className="teacher-review-heading">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Skeleton width={172} height={18} />
                  <Skeleton width={240} height={11} style={{ marginTop: 8 }} />
                </div>
                <Skeleton width={88} height={24} radius={999} />
              </div>

              <div className="teacher-details">
                {Array.from({ length: 4 }, (_, detailIndex) => (
                  <div key={detailIndex}>
                    <Skeleton width={82} height={10} />
                    <Skeleton width="72%" height={13} style={{ marginTop: 10 }} />
                  </div>
                ))}
              </div>

              <Skeleton height={78} radius={8} />

              <div className="teacher-review-actions" style={{ marginTop: 12 }}>
                <Skeleton width={140} height={40} radius={8} />
                <Skeleton width={132} height={40} radius={8} />
                <Skeleton width={82} height={40} radius={8} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </SkeletonScreen>
  );
}
