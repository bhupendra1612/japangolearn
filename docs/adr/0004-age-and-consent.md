# ADR 0004: Age and consent

- Status: Provisional
- Revision date: 2026-07-22
- Owner approval: Legal and policy approval required before beta enrollment

## Context

Teacher verification and marketplace purchases introduce consent and minor-safety obligations.

## Decision

The MVP beta is provisionally restricted to teachers and students aged 18 or older. Capture versioned terms, privacy, teacher-agreement, and commerce-policy consent with timestamp and source.

## Consequences

Age and consent gates must fail closed. Consent evidence is immutable; accepting a new policy version creates a new record.

## Alternatives

Guardian consent and mixed-age access were deferred because they require additional identity, policy, moderation, and store-compliance work.
