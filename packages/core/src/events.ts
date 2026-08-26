export const DOMAIN_EVENT_NAMES = [
  "teacher.application.submitted",
  "teacher.application.approved",
  "course.revision.published",
  "media.asset.ready",
  "commerce.order.paid",
  "entitlement.access.granted",
  "payout.batch.completed",
] as const;

export type DomainEventName = (typeof DOMAIN_EVENT_NAMES)[number];

export interface DomainEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  name: DomainEventName;
  occurredAt: string;
  aggregateId: string;
  payload: TPayload;
}

export interface AuditRecord {
  id: string;
  action: string;
  actorId: string | null;
  subjectId: string;
  occurredAt: string;
  requestId: string;
  metadata: Record<string, unknown>;
}

// Analytics events remain a separate, lossy product-observation stream.
export interface AnalyticsObservation {
  name: string;
  observedAt: string;
  anonymousId?: string;
  userId?: string;
  properties: Record<string, unknown>;
}
