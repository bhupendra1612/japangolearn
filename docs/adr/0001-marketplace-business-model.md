# ADR 0001: Marketplace business model

- Status: Provisional
- Revision date: 2026-07-22
- Owner approval: Required before Phase 5 paid behavior

## Context

JapanGoLearn is adding a teacher marketplace without an existing seller, tax, or payment operating model.

## Decision

The MVP is designed for one-time course purchases. JapanGoLearn is the provisional seller of record and payment collector; no paid production behavior may be enabled until the legal entity, seller obligations, and payment account are approved.

## Consequences

The schema may model multi-currency prices, orders, payments, and refunds, but subscriptions and teacher-direct collection are out of scope. Commerce flags and server kill switches remain disabled.

## Alternatives

Subscriptions, teacher-as-seller, and a merchant-of-record provider were considered and deferred because each changes entitlement, tax, refund, and payout design.
