# ADR 0002: Currency, refunds, and access

- Status: Provisional
- Revision date: 2026-07-22
- Owner approval: Legal and accounting review required before Phase 5 production

## Context

Course prices, refunds, and entitlement duration need stable data contracts before commerce implementation.

## Decision

Store money as integer minor units with ISO 4217 currency codes. The beta UI is INR-first. The working refund rule is seven days with no more than 20% completion, allowing audited admin exceptions. Purchased access has no fixed expiry while the course and service remain available.

## Consequences

Progress evidence must be available to refund decisions, exceptions require audit records, and the model must not use floating-point money.

## Alternatives

Major-unit decimals, fixed-term access, and unconditional refunds were rejected as unsafe or inconsistent with the proposed beta model.
