# Phase 0 environment and promotion runbook

## Environment matrix

| Environment | Supabase                    | Cloudflare                       | Bunny                        | Payment                | Data       |
| ----------- | --------------------------- | -------------------------------- | ---------------------------- | ---------------------- | ---------- |
| Local       | Local CLI                   | Local Wrangler/Next/Expo         | Fake provider                | Fake provider          | Seed/test  |
| PR preview  | Staging-only or fakes       | Unique preview                   | Staging library only         | Sandbox                | Disposable |
| Staging     | Dedicated staging project   | `japangolearn-*-staging` Workers | Dedicated staging library    | Sandbox                | Synthetic  |
| Production  | Existing production project | Production Workers               | Dedicated production library | Live, after owner gate | Real users |

Runtime validation in `@japangolearn/environment` rejects the production Supabase project in development, test, preview, and staging. Example files contain placeholders only.

## Account-owner provisioning checklist

These resources require authenticated account access and are not created by repository code:

- Create `japangolearn-staging` as a dedicated Supabase project or persistent branch. Apply migrations and `supabase/seed.sql`; do not import production users.
- Create GitHub environments named `staging` and `production`. Require reviewers for `production`.
- Add separate `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, Supabase URL/key, and Sentry secrets to each GitHub environment.
- Add staging variables `WEB_URL`, `ADMIN_URL`, and `API_URL` after the first Worker deployment.
- Create the Bunny Stream library `japangolearn-staging`; store its library ID, API key, and token key only in the staging environment.
- Keep production Bunny and future live payment credentials exclusive to the production environment.

## Promotion flow

1. A push to `main` runs the complete Phase 0 verification workflow.
2. Successful verification deploys web, admin, and API to the GitHub `staging` environment.
3. The workflow smoke-tests all configured staging URLs, including `/api/v1/health`.
4. An operator starts `Cloudflare Production` manually and supplies the successful staging workflow run ID.
5. The production workflow verifies that the run succeeded on `main`, checks out that exact commit, then waits for GitHub production-environment approval.

Never promote a different commit from the one verified on staging.
