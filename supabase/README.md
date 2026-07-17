# Supabase Project

This monorepo uses the existing Supabase project:

- name: `japanese`
- ref: `teylstfbjtutssnfmhhu`
- region: `ap-south-1`
- public URL: `https://teylstfbjtutssnfmhhu.supabase.co`
- dashboard: `https://supabase.com/dashboard/project/teylstfbjtutssnfmhhu`

## Schema source of truth

`supabase/migrations` contains a complete additive baseline plus the learning
attempt, event, XP ledger, mastery, and daily quest model. New environments should
be created through the migration stack rather than dashboard-only schema changes.

## Monorepo Layout

- `supabase/migrations` contains SQL migration history copied from the old
  `Japanese` project.
- `supabase/seed/kanji` contains the JLPT N5 Kanji seed data and runner.
- `packages/database/src/supabase.types.ts` contains the shared Supabase
  TypeScript database contract used by web, mobile, and admin.

## Commands

```bash
pnpm db:types
pnpm db:types:local
pnpm db:types:check:local
pnpm db:security:audit
pnpm db:backup:verify
pnpm seed:kanji
```

`pnpm db:types` uses the Supabase CLI to generate live TypeScript types from
project `teylstfbjtutssnfmhhu`. It requires `supabase login` or
`SUPABASE_ACCESS_TOKEN`.

`pnpm seed:kanji` reads env values from root/app `.env.local` files and upserts
`supabase/seed/kanji/n5-remaining.json` into the `kanji` table.

CI resets a local Supabase database, verifies the generated type shape, audits RLS,
functions, grants, and storage policies, runs RPC integration tests, and restores a
backup into an isolated database. The production type check runs on `main` when the
`SUPABASE_ACCESS_TOKEN` repository secret is configured.
