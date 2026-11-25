# Supabase Project

This monorepo uses the self-hosted Supabase instance on the JapanGoLearn VPS:

- name: `japanese`
- public URL: `https://supabase.japangolearn.com`
- Studio: access through the VPS SSH tunnel on `127.0.0.1:13100`

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
the configured database connection. It requires the database URL or an SSH
tunnel to the VPS.

`pnpm seed:kanji` reads env values from root/app `.env.local` files and upserts
`supabase/seed/kanji/n5-remaining.json` into the `kanji` table.

CI resets a local Supabase database, verifies the generated type shape, audits RLS,
functions, grants, and storage policies, runs RPC integration tests, and restores a
backup into an isolated database. The production type check runs on `main` when the
`SUPABASE_ACCESS_TOKEN` repository secret is configured.
