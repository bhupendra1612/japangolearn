# Phase 0 status

Last verified: 2026-07-25.
Local Docker decision: skipped by owner on 2026-07-23. Dedicated staging
Supabase and Bunny resources were also waived for the functional MVP. The
owner authorized one live resource set and a direct production API deployment.

## Repository work

- [x] Nine decision records capture accepted choices and provisional owner gates.
- [x] Environment examples contain placeholders and separate preview, staging, and production values.
- [x] Web, admin, mobile, API, and CI use fail-closed environment validation.
- [x] `apps/api`, `packages/api-contracts`, and `packages/providers` establish `/api/v1` contracts and provider fakes.
- [x] Marketplace visibility flags default off and server kill switches default on.
      (Corrected 2026-08-13: the flags existed but no route or component read them,
      so nothing was actually gated. Now enforced in web middleware, the mobile tab
      layout, and the admin shell.)
- [x] Domain event names and separate analytics/audit types are defined.
- [x] ESLint uses `--max-warnings=0`; the 30 existing mobile warnings are fixed.
- [x] API/environment/provider tests and Cloudflare dry-run/type gates are included in Turbo and CI.
- [x] Repository staging/promotion workflows remain available for later hardening.
- [x] Existing database replay, security, backup, integration, E2E, and accessibility gates remain required.

## Verification result

Formatting, zero-warning lint, type checking, unit tests, test type checking,
Expo validation, all workspace builds, environment isolation checks, and the
Cloudflare API dry run pass locally. The unit suite contains 25 passing tests.

Docker-backed database replay and destructive reset/restore checks are not run
on this machine and are owner-waived for the functional MVP. They must never be
redirected to the hosted production Supabase project. Remaining safe,
non-destructive CI and manual checks stay open.

## Account-owner exit gates

Current account-owner decisions and gates:

- [x] Reuse the existing Supabase project for the functional MVP.
- [x] Deploy the production `japangolearn-api` Worker.
- [x] Configure one live Bunny Stream library and encrypted Worker secrets.
- [ ] Create/protect GitHub `staging` and `production` environments and populate their secrets/variables.
- [ ] Run and record the remaining safe CI/manual verification.

The owner authorized the functional marketplace vertical slice before every
hardening gate closes. Track manual verification and approved exceptions in
[`saas-phase-progress.md`](./saas-phase-progress.md).
