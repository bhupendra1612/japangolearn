# JapanGoLearn Three-Chat Execution Plan

> **Superseded on 2026-07-22.** The current canonical roadmap is `docs/saas-implementation-plan.md`. Retain this file only as historical planning context; do not create the worktrees or use the chat assignments below.

Status: day-to-day execution guide  
Last updated: 2026-07-22  
Team: this coordinating chat plus two other AI-agent chats

## 1. How to use this plan

This is the simplified companion to `docs/saas-multi-agent-implementation-plan.md`.

- This file says **which chat owns each complete phase**, what may run in parallel, and when to hand work back.
- The canonical plan contains the detailed schemas, security rules, contracts, exit gates, and business decisions.
- If the two documents appear to conflict, this file controls phase ownership and the canonical plan controls technical requirements.
- A phase owner is accountable for the complete phase: schema, API, UI, tests, documentation, and handoff.
- Supporting chats may do only the explicitly listed parallel preparation. They must not change the active phase's schema or frozen contracts.

Do not ask all three chats to implement unrelated future phases at the same time. The critical path still matters. Parallel work is used inside safe boundaries.

## 2. The three chats

### Chat 1 — This chat: coordinator and integration owner

Responsibilities:

- own Phase 0, Phase 3, Phase 5, and Phase 8;
- approve contracts before parallel implementation;
- review every phase PR and run final integration checks;
- resolve shared-file and generated-type conflicts;
- merge PRs in dependency order;
- configure staging/production resources with the owner;
- apply authorized staging/production migrations;
- manage Bunny, payment, Cloudflare, Supabase, and release integration;
- update phase status and tell the other chats what to start next.

This chat remains the only release and production-mutation authority.

### Chat 2 — Agent 1: identity, access, and finance owner

Owned phases:

- Phase 1 — multi-role identity and teacher onboarding;
- Phase 4 — catalog, entitlement core, enrollment, and free learning;
- Phase 6 — teacher earnings, payouts, moderation, and operations.

Agent 1 is the main owner for Supabase-heavy work. While Agent 1 owns an active phase, no other chat creates a migration or regenerates Supabase types until Agent 1's schema PR is integrated.

### Chat 3 — Agent 2: authoring and mobile owner

Owned phases:

- Phase 2 — course model, localization, moderation, and teacher studio;
- Phase 7 — notifications and mobile marketplace.

Agent 2 owns the teacher and mobile product experiences end to end. During Phase 2 or Phase 7, Agent 2 receives exclusive migration allocation for that phase.

## 3. Simple phase ownership

| Phase   | Accountable chat | Main result                                                                             | Starts after                                           |
| ------- | ---------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Phase 0 | This chat        | Decisions, staging isolation, contracts, provider ports, feature flags, zero-warning CI | Current baseline                                       |
| Phase 1 | Agent 1          | Multi-role accounts, teacher application, approval, suspension, role/RLS tests          | Phase 0 merged                                         |
| Phase 2 | Agent 2          | Course schema, localization, revisions, teacher studio, moderation                      | Phase 1 merged                                         |
| Phase 3 | This chat        | Bunny TUS upload, webhooks, media metadata, protected playback, private materials       | Phase 2 contract/schema available                      |
| Phase 4 | Agent 1          | Catalog, free enrollment, entitlement source of truth, progress and learning access     | Phase 2 merged; secure playback connects after Phase 3 |
| Phase 5 | This chat        | Orders, payment provider, webhooks, refunds and paid entitlements                       | Phases 3 and 4 merged; owner commerce gates approved   |
| Phase 6 | Agent 1          | Commission snapshots, earnings ledger, payouts, finance/support operations              | Phase 5 merged                                         |
| Phase 7 | Agent 2          | Notifications, mobile purchases, restore, teacher companion mode                        | Phases 3–5 merged; Phase 6 contract frozen             |
| Phase 8 | This chat        | Security, recovery, accessibility, beta, release and production rollout                 | Phases 1–7 merged                                      |

### Workload summary

```text
This chat: Phase 0 -> Phase 3 -> Phase 5 -> Phase 8
Agent 1:   Phase 1 -> Phase 4 -> Phase 6
Agent 2:   Phase 2 -> Phase 7
```

Agent 2 has fewer phases because Phase 2 and Phase 7 are the two largest client-product phases.

## 4. Fastest safe execution schedule

## Round 0 — Complete Phase 0

**Owner: this chat**

This chat implements and integrates:

- ADRs and business decision register;
- staging Supabase/Cloudflare/Bunny isolation;
- `/api/v1` contracts and error envelope;
- provider interfaces and test fakes;
- marketplace feature flags;
- audit/event naming;
- removal of production environment fallbacks;
- zero-warning lint and CI enforcement.

Safe parallel support:

- Agent 1 may review the current role/RLS model and prepare a Phase 1 task checklist only.
- Agent 2 may fix the 30 mobile lint warnings on a dedicated branch if this chat assigns that task explicitly.
- Neither external chat may create marketplace migrations during Round 0.

Round 0 ends only when Phase 0 is merged and staging isolation passes.

## Round 1 — Identity while authoring is prepared

**Phase owner: Agent 1 — Phase 1**

Agent 1 implements:

- `user_roles` compatibility migration;
- student plus teacher multi-role model;
- teacher profiles/applications/documents/reviews;
- approval, rejection, changes-requested, and suspension states;
- private qualification documents;
- authorization APIs;
- teacher application UI and admin review UI;
- RLS, role-matrix, integration, and E2E tests.

Safe parallel work:

- Agent 2 prepares Phase 2 course/teacher-studio wireframes and typed fixtures only. It does not create course migrations or redefine Phase 1 contracts.
- This chat reviews Phase 1 contracts, prepares staging resources, and may implement provider fakes that do not depend on course schema.

Handoff:

1. Agent 1 opens a draft PR.
2. The owner sends the PR number to this chat.
3. This chat reviews, fixes integration issues, verifies staging, and merges.
4. Agent 2 rebases on the merged Phase 1 before starting real Phase 2 integration.

## Round 2 — Course model and teacher studio

**Phase owner: Agent 2 — Phase 2**

Agent 2 implements:

- courses and immutable revisions;
- English/Hindi localization rows;
- sections and lessons;
- publishing and moderation states;
- teacher studio app;
- course builder, autosave, preview, and submission;
- admin moderation screens;
- RLS, API, UI, and E2E tests.

Safe parallel work:

- This chat prepares Bunny adapter tests and API-client fakes without creating media migrations until Phase 2's media contract is frozen.
- Agent 1 prepares the Phase 4 entitlement/catalog design and test matrix only.

Integration sequence:

1. Agent 2 freezes and commits course/media attachment contracts.
2. Agent 2 completes the schema and generated types.
3. This chat reviews and merges Phase 2.
4. Phase 3 and Phase 4 may then overlap using the schema ordering in Round 3.

## Round 3 — Bunny media and free-learning foundation overlap

**Primary owners: this chat for Phase 3, Agent 1 for Phase 4**

This is the main safe parallel acceleration point.

### Step 3A — Phase 3 schema first

This chat creates and merges only the Phase 3 media schema and contracts:

- provider-neutral media assets;
- lesson media attachments;
- media webhook inbox;
- study material records;
- status state machine and RLS.

Agent 1 does not create Phase 4 migrations until Step 3A is merged.

### Step 3B — Parallel implementation

After the Phase 3 schema is merged:

**This chat continues Phase 3:**

- Bunny video creation;
- signed TUS uploads;
- webhook HMAC verification;
- duplicate/out-of-order event handling;
- processing status mapping;
- short-lived playback grants;
- private R2 study-material access;
- upload and playback integration tests.

**Agent 1 starts Phase 4:**

- entitlement and entitlement-event schema;
- enrollments;
- lesson/course progress;
- notes and bookmarks;
- catalog/free-enrollment/access APIs;
- catalog and free-learning UI;
- RLS and E2E tests.

**Agent 2 supports without schema changes:**

- teacher upload UI against the approved Phase 3 contract;
- student player UI;
- public course and teacher-page UI;
- accessibility states and typed fixtures.

Agent 2 submits these as small support PRs targeted at the phase owner's branch or waits for the owner to request them. It must not merge directly to `main`.

Round 3 ends when both Phase 3 and Phase 4 are independently green and integrated on `main`.

## Round 4 — Commerce while mobile-free experience advances

**Phase owner: this chat — Phase 5**

Before starting, the owner must confirm:

- legal entity and seller of record;
- payment provider and sandbox access;
- INR/refund/access rules;
- tax/invoice requirements;
- platform commission definition.

This chat implements:

- products and prices;
- immutable orders and order items;
- payment attempts and transactions;
- payment webhook inbox and replay handling;
- refunds/chargebacks;
- atomic paid entitlement granting;
- checkout and purchase history;
- admin order/refund tools;
- reconciliation and complete failure/duplicate tests.

Safe parallel work:

- Agent 1 prepares Phase 6 commission/earning/payout contracts and invariant tests, but does not create financial migrations before Phase 5 is merged.
- Agent 2 implements free mobile catalog, secure playback, progress, teacher application status, and teacher profile editing. It must not implement mobile purchases yet.

## Round 5 — Earnings and mobile marketplace overlap

**Primary owners: Agent 1 for Phase 6, Agent 2 for Phase 7**

Both depend on the Phase 5 commerce contract, so migration ordering is required.

### Step 5A — Phase 6 schema first

Agent 1 creates and merges:

- commission rules/snapshots;
- teacher earning ledger;
- payout accounts/batches/items/adjustments;
- finance/support permissions;
- dispute and moderation operation records.

Agent 2 does not create Phase 7 receipt/notification migrations until Step 5A is merged.

### Step 5B — Parallel implementation

**Agent 1 finishes Phase 6:**

- earning calculations;
- refund/chargeback adjustments;
- payout holding and manual payout workflow;
- reconciliation export;
- teacher earning and admin finance UI;
- permission, audit, and invariant tests.

**Agent 2 implements Phase 7:**

- notification preferences, devices, outbox, and deliveries;
- mobile StoreKit and Play Billing adapters;
- server-side receipt verification;
- restore, refund, and revocation synchronization;
- student mobile purchase UI;
- teacher companion mode;
- real-device and E2E testing.

**This chat:**

- reviews both frozen financial contracts;
- prevents duplicate shared-file edits;
- integrates Agent 1's schema before Agent 2's schema;
- runs complete commerce/entitlement/earnings/mobile integration tests.

## Round 6 — Hardening, beta, and launch

**Owner: this chat — Phase 8**

This chat owns the final gate and delegates bounded support tasks:

- Agent 1: full RLS/permission matrix, advisors, deletion/export, backup/restore, finance invariants.
- Agent 2: accessibility, captions, localization, legal/support surfaces, mobile release checks, complete E2E.
- This chat: load/rate tests, Bunny/payment webhook replay, observability, quotas, recovery, rollback, beta coordination, deployment, and production feature flags.

Nothing is publicly enabled until all Phase 8 gates pass and the owner authorizes production rollout.

## 5. Worktree and branch setup

Do not run all three chats in the same working directory. After this plan is committed and pushed to `main`, create two persistent worktrees:

```powershell
cd F:\JP\japangolearn
git fetch origin
git worktree add F:\JP\japangolearn-agent1 -b agent/p1-identity origin/main
git worktree add F:\JP\japangolearn-agent2 -b agent/p2-course-studio-prep origin/main
```

Use:

```text
This chat: F:\JP\japangolearn
Agent 1:   F:\JP\japangolearn-agent1
Agent 2:   F:\JP\japangolearn-agent2
```

After a phase is merged, the phase agent starts a new branch from the latest `origin/main`. It does not keep adding future phases to the old branch.

Example for Agent 1 after Phase 1 merges:

```powershell
cd F:\JP\japangolearn-agent1
git fetch origin
git switch -c agent/p4-entitlements origin/main
```

The coordinating chat must confirm a branch name before the next phase begins.

## 6. Rules that prevent the three chats from damaging each other's work

1. One accountable phase owner.
2. One active migration owner at a time.
3. One generated Supabase-types owner at a time.
4. One lockfile owner at a time.
5. Shared contracts freeze before UI/API parallel work.
6. Other chats do not edit the active owner's reserved files.
7. Every phase uses a separate branch and draft PR.
8. Agent 1 and Agent 2 never merge their own PRs.
9. This chat reviews and merges in dependency order.
10. No agent applies production migrations or deploys production.
11. No secret is sent in chat or committed.
12. A client feature flag never replaces authorization or RLS.

Shared files require this chat's permission:

```text
supabase/migrations/
packages/database/src/supabase.types.ts
packages/api-contracts/
packages/providers/
packages/core/src/feature-flags.ts
packages/core/src/analytics.ts
package.json files
pnpm-lock.yaml
turbo.json
.env.example
.github/workflows/
wrangler configuration
```

## 7. What each external chat must do at the end of a phase

The phase owner must:

1. run all relevant local checks;
2. update technical documentation;
3. commit and push the phase branch;
4. open a draft PR;
5. report migrations, contracts, environment-variable names, and risks;
6. stop and wait—do not merge or begin the next phase.

The owner then sends this message in this coordinating chat:

```text
Agent 1/Agent 2 finished Phase <number>.
Branch: <branch>
PR: <number or URL>
Please review, run integration checks, merge if safe, and give the next-agent instruction.
```

## 8. Prompt for the Agent 1 chat

Paste this only after this plan is committed and Agent 1's worktree is ready:

```text
You are Agent 1 for JapanGoLearn. Work only in F:\JP\japangolearn-agent1.

Read completely:
- docs/three-chat-execution-plan.md
- docs/saas-multi-agent-implementation-plan.md
- docs/p0-engineering.md
- docs/database-security-audit.md

You own Phase 1, Phase 4, and Phase 6, but your current assignment is Phase 1 only. Do not implement Phase 4 or Phase 6 yet.

Implement Phase 1 end to end using branch agent/p1-identity. You have exclusive migration and generated Supabase-type ownership for this phase. Follow every RLS, grant, test, CI, task-handoff, and stop condition in the plans. Do not apply staging or production migrations. Do not merge your PR.

When complete, push the branch, open a draft PR, and return the required handoff. Then stop.
```

## 9. Prompt for the Agent 2 chat

During Round 0 or Round 1, paste this preparation-only prompt:

```text
You are Agent 2 for JapanGoLearn. Work only in F:\JP\japangolearn-agent2.

Read completely:
- docs/three-chat-execution-plan.md
- docs/saas-multi-agent-implementation-plan.md
- docs/p0-engineering.md
- docs/database-security-audit.md

You own Phase 2 and Phase 7. Phase 2 is blocked until Phase 1 is merged.

For now, inspect the existing apps and prepare a concise Phase 2 implementation checklist, route map, UI component map, typed fixture plan, and expected file ownership. Do not create migrations, change shared API contracts, install dependencies, or implement real Phase 2 integration. Return the preparation plan and stop.
```

After Phase 1 is merged, this chat will give Agent 2 a new prompt authorizing full Phase 2 implementation on a fresh branch from `origin/main`.

## 10. Validation and merge authority

Each agent runs the checks relevant to its changes. Before merging a phase, this chat runs the full applicable integration gate:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:typecheck
pnpm build:web
pnpm build:admin
pnpm check:mobile
pnpm check:expo
pnpm exec supabase start
pnpm exec supabase db reset
pnpm db:types:check:local
pnpm db:security:audit
pnpm db:backup:verify
pnpm test:integration
pnpm test:e2e
pnpm exec supabase stop
```

Add API and teacher builds when those apps exist.

Only this coordinating chat may declare a phase integrated, update the status table, and authorize the next phase.

## 11. Current status and immediate next step

| Phase   | Owner     | Status                                   | Next requirement                                   |
| ------- | --------- | ---------------------------------------- | -------------------------------------------------- |
| Phase 0 | This chat | Ready to start after plans are committed | Owner authorizes Phase 0 implementation            |
| Phase 1 | Agent 1   | Blocked                                  | Phase 0 merged                                     |
| Phase 2 | Agent 2   | Blocked; preparation only                | Phase 1 merged                                     |
| Phase 3 | This chat | Blocked                                  | Phase 2 contract/schema                            |
| Phase 4 | Agent 1   | Blocked                                  | Phase 2 merged; Phase 3 media schema ordered first |
| Phase 5 | This chat | Blocked                                  | Phases 3–4 plus commerce owner gates               |
| Phase 6 | Agent 1   | Blocked                                  | Phase 5 merged                                     |
| Phase 7 | Agent 2   | Blocked                                  | Phases 3–5 and Phase 6 contract                    |
| Phase 8 | This chat | Blocked                                  | Phases 1–7 merged                                  |

Immediate order:

1. Commit and push both planning documents.
2. Begin Phase 0 in this chat.
3. Create the two worktrees after the plan is available on `main`.
4. Give Agent 1 the Phase 1 prompt only after Phase 0 merges.
5. Give Agent 2 the preparation prompt while Agent 1 works on Phase 1.
