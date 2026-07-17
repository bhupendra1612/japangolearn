# P0 engineering foundation

## Database lifecycle

The migration stack under `supabase/migrations` is now the source of truth. A clean
database must be reproducible with:

```bash
pnpm exec supabase start
pnpm exec supabase db reset
pnpm db:types:check:local
pnpm db:security:audit
pnpm test:integration
pnpm db:backup:verify
```

`pnpm db:types` generates types from the hosted project and requires
`SUPABASE_ACCESS_TOKEN`. `pnpm db:types:local` generates from the local migration
stack. Both write `packages/database/src/supabase.types.ts`. The check variants
compare all public table/column and RPC/argument names and fail on structural drift.
The main-branch CI check requires `SUPABASE_ACCESS_TOKEN`; a missing token fails the
gate instead of silently skipping production drift verification.

## Learning data model

- `learning_attempts` and `learning_attempt_answers` are the authoritative learning
  history.
- `activity_events` contains analytics and product events.
- `xp_ledger` is the immutable XP source of truth.
- `mastery_records` contains review state independently from activity history.
- `daily_quest_completions` proves a quest was completed by a qualifying attempt.
- `activity_log` and `daily_goals` remain compatibility projections while clients
  migrate.

Clients cannot write attempts, XP, events, or daily quest completion directly. The
`award_xp` RPC validates the score, creates the attempt, writes the ledger and event,
updates streak projections, and handles retry idempotency by attempt key.

## Backups and restoration

The `Encrypted database backup` workflow runs daily and can be started manually. It
requires these repository secrets:

- `SUPABASE_DB_URL`: the percent-encoded direct database connection string.
- `BACKUP_ENCRYPTION_PASSPHRASE`: a strong passphrase stored outside GitHub as part
  of the recovery plan.

The workflow creates a compressed custom-format PostgreSQL backup, verifies that
`pg_restore` can read its catalog, encrypts it with AES-256, and retains the artifact
for 30 days. CI separately restores local schema and data into an isolated temporary
database with `pnpm db:backup:verify`.

Quarterly restore drill:

1. Download an encrypted artifact.
2. Decrypt it with the recovery passphrase.
3. Create an isolated PostgreSQL instance matching production major version.
4. Run `pg_restore --no-owner --no-acl --exit-on-error`.
5. Verify authentication, profile count, content count, attempts, XP ledger totals,
   and daily quest records.
6. Record recovery time and any manual fixes in the incident log.

## Feature flags

AI, premium surfaces, and unfinished JLPT levels default off:

```text
NEXT_PUBLIC_FEATURE_AI=false
NEXT_PUBLIC_FEATURE_PREMIUM=false
NEXT_PUBLIC_FEATURE_UNFINISHED_LEVELS=false
EXPO_PUBLIC_FEATURE_AI=false
EXPO_PUBLIC_FEATURE_PREMIUM=false
EXPO_PUBLIC_FEATURE_UNFINISHED_LEVELS=false
```

AI practice is only visible when both AI and premium are enabled. N4-N1 learning
paths remain hidden until unfinished levels are explicitly enabled.
