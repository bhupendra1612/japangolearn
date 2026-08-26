# ADR 0005: Course localization

- Status: Accepted
- Revision date: 2026-07-22
- Owner approval: Approved in the canonical implementation plan

## Context

Marketplace courses need English and Hindi metadata without duplicating the course model for each language.

## Decision

Use BCP-47 localization rows attached to immutable course revisions. Start with `en` and `hi`, require a primary locale, and fall back to it when the requested locale is unavailable. Japanese is taught content, not a UI locale column.

## Consequences

At least one complete locale is required for submission. Columns such as `title_en` and `title_hi` are prohibited.

## Alternatives

Per-language columns and separate course records were rejected because they scale poorly and make revision consistency difficult.
