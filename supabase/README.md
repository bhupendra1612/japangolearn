# Supabase Project

This monorepo uses the existing Supabase project:

- name: `japanese`
- ref: `teylstfbjtutssnfmhhu`
- region: `ap-south-1`
- public URL: `https://teylstfbjtutssnfmhhu.supabase.co`
- dashboard: `https://supabase.com/dashboard/project/teylstfbjtutssnfmhhu`

## Current Schema Snapshot

Checked through Supabase MCP on 2026-07-02.

Important public tables:

- `profiles` - 5 rows
- `kana` - 202 rows
- `kanji` - 100 rows
- `practice_lists` - 4 rows
- `practice_list_items` - 21 rows
- `daily_goals` - 1 row
- `activity_log` - 1 row
- `user_streaks` - 1 row
- `vocabulary` - 0 rows
- `grammar_patterns` - 0 rows
- `achievements` - 0 rows
- `blog_posts` - 0 rows
- `contact_submissions` - 0 rows

All listed public tables reported `rls_enabled: true`.

`kanji` already contains rich learning content columns including meanings,
Hindi pronunciation, readings, related/confusable kanji, tags, vocabulary JSON,
and example sentence JSON.

No Edge Functions are currently deployed.

## Monorepo Layout

- `supabase/migrations` contains SQL migration history copied from the old
  `Japanese` project.
- `supabase/seed/kanji` contains the JLPT N5 Kanji seed data and runner.
- `packages/database/src/supabase.types.ts` contains the shared Supabase
  TypeScript database contract used by web, mobile, and admin.

## Commands

```bash
pnpm db:types
pnpm seed:kanji
```

`pnpm db:types` uses the Supabase CLI to generate live TypeScript types from
project `teylstfbjtutssnfmhhu`. It requires `supabase login` or
`SUPABASE_ACCESS_TOKEN`.

`pnpm seed:kanji` reads env values from root/app `.env.local` files and upserts
`supabase/seed/kanji/n5-remaining.json` into the `kanji` table.

## Current Limitation

On 2026-07-02, live type generation could not complete in Codex because the
Supabase CLI and MCP session were not authenticated. The committed
`supabase.types.ts` file is a repo-local bridge matching the current app schema
usage and should be replaced by `pnpm db:types` after Supabase CLI login.
