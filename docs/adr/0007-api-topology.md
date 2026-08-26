# ADR 0007: API topology

- Status: Accepted
- Revision date: 2026-07-22
- Owner approval: Approved for Phase 0

## Context

Web, admin, teacher, and mobile clients need one stable boundary for privileged marketplace commands and provider integrations.

## Decision

`apps/api` owns `/api/v1`. `packages/api-contracts` owns runtime schemas and stable errors; `packages/providers` owns narrow external-service ports. Responses use request-ID envelopes, UUIDs, UTC ISO timestamps, cursor pagination, integer minor-unit money, idempotency keys, and explicit rate-limit classes.

## Consequences

Raw Supabase/provider errors never cross the API. Breaking contracts require a new API version. Provider credentials are available only to the API runtime.

## Alternatives

Duplicated Next.js route handlers and direct provider calls from clients were rejected because they fragment authorization and error contracts.
