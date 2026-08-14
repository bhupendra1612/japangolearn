# ADR 0009: Authorization and audit

- Status: Accepted
- Revision date: 2026-07-22
- Owner approval: Approved as the security baseline

## Context

Public feature visibility, privileged commands, business events, analytics, and audit evidence have different trust and retention needs.

## Decision

Feature flags never grant authorization. Commands require authenticated permission and database enforcement, with server kill switches as an independent operational control. Domain events use lower-case past-tense names. Analytics observations, transactional/outbox events, and immutable audit records remain separate streams.

## Consequences

Every sensitive transition records actor, subject, request ID, timestamp, action, and metadata. Service-role access remains server-only, and RLS is retained as defense in depth.

## Alternatives

Using UI flags as authorization and sharing one generic event table were rejected because they weaken enforcement and audit meaning.
