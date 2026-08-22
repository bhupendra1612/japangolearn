# ADR 0008: Environment and secrets isolation

- Status: Accepted; infrastructure provisioning pending
- Revision date: 2026-07-22
- Owner approval: Account owner must create staging Supabase, Cloudflare, Bunny, and GitHub environments

## Context

The former deployment path could build previews against production Supabase and deployed `main` directly to production Workers.

## Decision

Use isolated local, preview, staging, and production configurations. Runtime validation rejects the production Supabase project outside production. `main` deploys to Cloudflare staging; production is a manual promotion of a successful staging run. Provider and service-role credentials are server-only and environment-scoped.

## Consequences

Staging uses synthetic data and separate Bunny credentials. Missing environment values fail the build. Production data must never be copied into staging.

## Alternatives

Shared production backends and branch-name-only separation were rejected because a configuration mistake could affect real users.
