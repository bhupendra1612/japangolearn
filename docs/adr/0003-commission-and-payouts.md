# ADR 0003: Commission and payouts

- Status: Provisional
- Revision date: 2026-07-22
- Owner approval: Finance, legal, and tax approval required before Phases 5–6 production

## Context

Teacher earnings must remain explainable when commission rules change or refunds occur.

## Decision

Use immutable earning-ledger entries with a commission snapshot per order item. The working commission is 20% of defined net course revenue. Payouts are monthly after a 30-day hold with an INR 1,000 minimum.

## Consequences

Rates are snapshotted, corrections use compensating entries, and payout batches are idempotent and auditable. No payout provider is selected in Phase 0.

## Alternatives

Recomputing earnings from current rates and mutable balance columns were rejected because they cannot produce a reliable financial audit trail.
