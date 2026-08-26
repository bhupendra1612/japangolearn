# JapanGoLearn SaaS manual phase tracker

Canonical requirements: [`saas-implementation-plan.md`](./saas-implementation-plan.md)

This file is the human-controlled record of phase completion. Check an exit-gate
item only after its implementation, tests, and evidence have been manually
reviewed. A phase is complete only when every exit-gate item is checked.

## Marketplace deferred past v1 (2026-08-13)

Owner decision: JapanGoLearn v1 ships as a free JLPT self-study product on web and
mobile. The teacher marketplace — public catalogue, enrolment, purchases, and the
teacher studio — is deferred to a later release so the mobile app can be published
without a payments integration.

This removes the two hardest mobile store obligations: Apple Guideline 3.1.1
(digital purchases must use In-App Purchase) and Guideline 1.2 (user-generated
content needs reporting, blocking, and 24-hour moderation).

Nothing was deleted. The implementation and the applied database migration stay in
place, hidden behind the existing feature flags:

- Web: `NEXT_PUBLIC_FEATURE_COURSE_CATALOG`, `NEXT_PUBLIC_FEATURE_TEACHER_STUDIO`
- Mobile: `EXPO_PUBLIC_FEATURE_COURSE_CATALOG`
- Admin: `NEXT_PUBLIC_FEATURE_TEACHER_ONBOARDING`

All default off. Web marketplace paths are blocked in middleware with a real 404,
which also blocks their server actions; the mobile Courses tab is hidden and the
route redirects home. Marketplace tables remain, empty and RLS-enabled.

**Before re-enabling, fix these RLS defects.** They are dormant only because no
course rows exist:

1. `private.can_access_course` has no `status = 'published'` check on its free-course
   branch, so any authenticated user can read lessons of unpublished and archived
   free courses.
2. `courses` has no entitlement-based SELECT policy, so a student loses sight of a
   purchased course if the teacher unpublishes or archives it.
3. `enroll_free_course` unconditionally resets `status` and clears `order_id`,
   restoring revoked entitlements and destroying the order link on a purchase.
4. `video_assets_teacher_update` does not re-check course ownership, letting a
   teacher attach a video asset to another teacher's course.

Also unresolved: idempotency keys are randomised on both web and mobile, so
duplicate pending orders are possible; and suspending a teacher leaves their
published courses live and purchasable.

## Status rules

- `Not started`: implementation has not begun.
- `In progress`: implementation is active, but at least one exit gate is open.
- `Blocked`: work cannot safely continue without an external decision or resource.
- `Complete`: every exit gate is checked and its evidence is recorded.
- Exit-gate completion remains sequential. The owner approved an early functional MVP vertical
  slice across later phases; this does not mark those phase exit gates complete.
- Docker-backed database checks run in GitHub Actions. Local Docker is optional.

## Progress overview

| Phase | Status      | Manual progress | Current next action                                     |
| ----- | ----------- | --------------- | ------------------------------------------------------- |
| 0     | In progress | 10/11           | Pass the remaining non-Docker CI/manual checks          |
| 1     | In progress | 0/6             | Apply migration and manually test role/approval matrix  |
| 2     | In progress | 0/6             | Manually test teacher course isolation and publishing   |
| 3     | In progress | 1/8             | Manually test direct upload, then add webhook hardening |
| 4     | In progress | 0/6             | Test catalog/free entitlement on web and Expo           |
| 5     | In progress | 0/7             | Select payment provider; pending orders are implemented |
| 6     | Not started | 0/6             | Wait for Phase 5                                        |
| 7     | In progress | 0/7             | Test Expo catalog; full mobile purchasing remains open  |
| 8     | Not started | 0/11            | Wait for Phase 7                                        |

## Manual review record

For every phase, record:

- Reviewer:
- Review date:
- Pull request or commit:
- Successful GitHub Actions run:
- Staging deployment:
- Test evidence or report:
- Open risks or approved exceptions:

Do not put credentials, API keys, connection strings, personal data, or other
secrets in this tracker.

## Functional marketplace MVP vertical slice

Owner override: implement the core product flow now, improve advanced behavior and UI later.

- [x] Additive multi-role schema; every new account starts as a student.
- [x] Same account can submit a teacher application.
- [x] Admin can approve/request changes/reject through the admin app.
- [x] Approved teacher can create free or paid course drafts.
- [x] Teacher can add sections, article/video lessons, and publish.
- [x] Cloudflare API creates short-lived Bunny direct-upload authorization.
- [x] Web catalog shows published courses and supports free enrollment.
- [x] Student web dashboard lists entitled courses.
- [x] Expo catalog supports free enrollment and paid-order creation.
- [x] Paid course action creates a pending order without granting unpaid access.
- [x] Service-role-only order fulfillment atomically grants paid entitlement.
- [x] Apply the marketplace migration to the owner-approved Supabase project.
- [x] Configure and deploy the Bunny-enabled Cloudflare API Worker.
- [ ] Run the complete manual vertical-slice checklist.
- [ ] Select and implement a real payment provider/webhook.
- [ ] Add protected Bunny playback, processing webhook, captions, and resumable-retry tests.

Manual checklist: [`marketplace-mvp-manual-test.md`](./marketplace-mvp-manual-test.md)

Migration evidence:

- Applied: 2026-07-24
- Supabase project ref: `teylstfbjtutssnfmhhu`
- Remote migration: `20260723121053_marketplace_mvp`
- Verification: 10/10 marketplace tables exist with RLS enabled; 7 existing users backfilled
  with the student role

API deployment evidence:

- Deployed: 2026-07-25
- Worker: `japangolearn-api`
- URL: `https://japangolearn-api.b76109dna.workers.dev`
- Version: `a5f17073-fe13-49c5-b887-fe13e29f6cf1`
- Verification: all four required secret bindings exist; health returned HTTP 200, the exact
  localhost CORS preflight returned HTTP 204, and an unauthenticated upload was rejected with
  HTTP 401

## Phase 0 — Product and engineering foundation

Status: **In progress**

Detailed evidence: [`phase-0-status.md`](./phase-0-status.md)

- [x] ADRs and pending owner gates are explicit.
- [x] Owner waived a dedicated staging Supabase project for the functional MVP.
- [x] Owner-authorized production Cloudflare API Worker is deployed and verified.
- [x] Owner waived a dedicated staging Bunny library; one live library is configured.
- [x] Preview/staging cannot connect to production Supabase.
- [x] Direct owner-authorized production deployment is recorded for the functional MVP.
- [x] `/api/v1` contracts and provider fakes pass tests.
- [x] All marketplace flags default off.
- [x] Lint has zero warnings and CI enforces zero warnings.
- [x] No production/provider secret exists in preview configuration.
- [ ] Complete existing CI passes.

Manual evidence:

- Reviewer: pending
- Review date: pending
- Pull request or commit: pending
- Successful GitHub Actions run: pending
- Staging deployment: pending
- Open risks: dedicated staging and Docker-backed checks are owner-waived for the functional MVP;
  the remaining non-Docker CI/manual checks are still open

## Phase 1 — Multi-role identity and teacher onboarding

Status: **In progress — functional MVP implemented; exit-gate verification open**

- [ ] One identity can be student and teacher.
- [ ] No self-grant or cross-user document access is possible.
- [ ] All teacher states have integration/E2E coverage.
- [ ] Existing admin access still works.
- [ ] Every role/review change has an audit record.
- [ ] RLS role matrix and security audit pass.

## Phase 2 — Course authoring, localization, moderation, and teacher studio

Status: **In progress — basic course studio implemented; full phase model/testing open**

- [ ] Approved teacher can create, preview, localize, and submit a course.
- [ ] Teacher cannot read/edit another teacher's draft.
- [ ] Submitted/published revision is immutable.
- [ ] Reviewer actions and publication are audited.
- [ ] Suspended teacher cannot author or submit.
- [ ] Only approved published metadata is publicly readable.

## Phase 3 — Bunny video pipeline and private study materials

Status: **In progress — Bunny direct upload implemented; hardening items open**

- [ ] Interrupted upload resumes.
- [x] Bunny credentials remain encrypted Worker secrets and do not enter client configuration.
- [ ] Invalid webhook signature is rejected.
- [ ] Duplicate/out-of-order webhook events are harmless.
- [ ] Cross-teacher media access/attachment is denied.
- [ ] Private video requires server playback grant.
- [ ] Caption/transcript rule blocks paid publication when incomplete.
- [ ] R2 material access is private and expiring.

## Phase 4 — Catalog, entitlement core, enrollment, and free learning

Status: **In progress — catalog and free entitlement slice implemented**

- [ ] Free enrollment creates exactly one entitlement.
- [ ] Preview lesson does not grant full course access.
- [ ] Revoked/expired entitlement blocks protected playback.
- [ ] Progress resumes across web/mobile test clients.
- [ ] Cross-user progress/notes/bookmarks are denied.
- [ ] Public catalog exposes only approved published content.

## Phase 5 — Web commerce and paid entitlements

Status: **In progress — safe pending orders implemented; real payment provider open**

- [ ] Successful payment creates one entitlement.
- [ ] Duplicate/out-of-order webhooks cannot duplicate money/access.
- [ ] Failed/cancelled payment grants nothing.
- [ ] Refund and chargeback match the approved policy.
- [ ] Students see only their own financial records.
- [ ] Reconciliation invariant tests pass.
- [ ] Production commerce flag remains off until approval.

## Phase 6 — Teacher earnings, payouts, moderation, and operations

Status: **Not started — locked by Phase 5**

- [ ] Every paid order reconciles to entitlement and earning entries.
- [ ] Refund adjusts earnings correctly.
- [ ] Holding period prevents premature payout.
- [ ] Support/reviewer cannot perform finance actions.
- [ ] Every override/moderation/refund/payout is audited.
- [ ] Finance can reproduce a payout from ledger records.

## Phase 7 — Notifications and mobile marketplace

Status: **In progress — Expo catalog/order slice implemented; full mobile phase open**

- [ ] Notification preferences and retries work.
- [ ] Duplicate deliveries are safe.
- [ ] Invalid push tokens are disabled.
- [ ] Apple/Google purchase/restore maps to internal entitlements.
- [ ] Refund/revocation removes access across web/mobile.
- [ ] Teacher companion cannot bypass web-studio permissions.
- [ ] Real iOS and Android device tests pass.

## Phase 8 — Hardening, controlled beta, and launch

Status: **Not started — locked by Phase 7**

- [ ] Account deletion/export verified.
- [ ] Required policies are published.
- [ ] Abuse, copyright, dispute, and support processes work.
- [ ] Load, rate-limit, security, and replay tests pass.
- [ ] Database and media recovery drills are recorded.
- [ ] Cost alerts exist for Bunny, R2, Supabase, and Cloudflare.
- [ ] Accessibility/localization/caption audit passes.
- [ ] Finance reconciliation and payout drill pass.
- [ ] Staging-to-production rollback drill passes.
- [ ] Beta has no unresolved launch-blocking issue.
- [ ] Owner explicitly authorizes public production rollout.

## Phase transition procedure

When the current phase appears ready:

1. Review every exit-gate checkbox against the canonical plan.
2. Run formatting, lint, types, unit tests, and builds locally.
3. Push the phase branch and open a pull request.
4. Require the complete GitHub Actions workflow to pass, including its
   Docker-backed local Supabase job.
5. Deploy the exact verified commit to staging and complete manual smoke tests.
6. Record the reviewer, date, pull request, workflow run, deployment, and risks.
7. Mark the phase `Complete`, then unlock only the next phase.
