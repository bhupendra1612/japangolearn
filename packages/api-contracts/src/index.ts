import { z } from "zod";

export const API_VERSION_PREFIX = "/api/v1" as const;

export const uuidSchema = z.uuid();
export const utcIsoTimestampSchema = z.iso.datetime({ offset: false });
export const currencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);
export const moneySchema = z.object({
  amountMinor: z.number().int().safe().nonnegative(),
  currency: currencyCodeSchema,
});

export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().min(1).max(512).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const cursorPageMetaSchema = z.object({
  requestId: uuidSchema,
  nextCursor: z.string().min(1).nullable(),
});

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[\w.:/-]+$/);

export const apiErrorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "IDEMPOTENCY_CONFLICT",
  "INTERNAL_ERROR",
  "COURSE_NOT_FOUND",
]);

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string().min(1),
    requestId: uuidSchema,
    details: z.record(z.string(), z.unknown()).default({}),
  }),
});

export function apiSuccessResponseSchema<T extends z.ZodType>(data: T) {
  return z.object({
    data,
    meta: z.object({ requestId: uuidSchema }),
  });
}

export const RATE_LIMIT_POLICIES = {
  auth: { requests: 10, windowSeconds: 60 },
  upload: { requests: 30, windowSeconds: 60 },
  playback: { requests: 120, windowSeconds: 60 },
  commerce: { requests: 20, windowSeconds: 60 },
} as const;

export type Money = z.infer<typeof moneySchema>;
export type CursorPaginationQuery = z.infer<typeof cursorPaginationQuerySchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
