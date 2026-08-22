import { describe, expect, it } from "vitest";
import {
  apiErrorResponseSchema,
  apiSuccessResponseSchema,
  cursorPaginationQuerySchema,
  idempotencyKeySchema,
  moneySchema,
} from "../src";
import { z } from "zod";

const requestId = "2f1f4db1-9b87-4f7f-ae5e-bb923d722001";

describe("API v1 contracts", () => {
  it("validates success and error envelopes", () => {
    expect(
      apiSuccessResponseSchema(z.object({ ok: z.boolean() })).parse({
        data: { ok: true },
        meta: { requestId },
      })
    ).toEqual({ data: { ok: true }, meta: { requestId } });

    expect(
      apiErrorResponseSchema.parse({
        error: { code: "NOT_FOUND", message: "Not found", requestId, details: {} },
      })
    ).toBeTruthy();
  });

  it("uses bounded cursor pagination", () => {
    expect(cursorPaginationQuerySchema.parse({}).limit).toBe(20);
    expect(() => cursorPaginationQuerySchema.parse({ limit: 101 })).toThrow();
  });

  it("requires integer minor-unit money and ISO currency", () => {
    expect(moneySchema.parse({ amountMinor: 19900, currency: "INR" })).toBeTruthy();
    expect(() => moneySchema.parse({ amountMinor: 19.9, currency: "inr" })).toThrow();
  });

  it("validates retry-safe idempotency keys", () => {
    expect(idempotencyKeySchema.parse("checkout:account/order-001")).toBeTruthy();
    expect(() => idempotencyKeySchema.parse("short")).toThrow();
  });
});
