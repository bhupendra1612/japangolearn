# JapanGoLearn

Fresh monorepo foundation for the JapanGoLearn language-learning product.

## Apps

- `apps/web` - public website and learner dashboard
- `apps/admin` - admin panel for users and learning content
- `apps/mobile` - Expo mobile app

## Packages

- `packages/config` - shared TypeScript configuration
- `packages/database` - shared Supabase project constants and database types
- `packages/content` - shared learning-content constants

## Supabase

This repo uses the self-hosted Supabase instance on the JapanGoLearn VPS:

- public URL: `https://supabase.japangolearn.com`
- Studio: access through the VPS SSH tunnel on `127.0.0.1:13100`

Copy `.env.example` to `.env.local` for web/admin development. For mobile development, pull the configured EAS development environment into the ignored app-local file:

```bash
pnpm --filter @japangolearn/mobile exec eas env:pull development --path .env.local --non-interactive
```

Mobile preview and production updates use their matching EAS environments through the root release scripts.

For Expo Go on a physical phone, `127.0.0.1` points to the phone, not the laptop.
Set `apps/mobile/.env.local` to a reachable Supabase URL and its **publishable**
key, then restart Expo so the values are rebuilt into the app. This repository
currently has only the production Supabase project; testing against it requires
`EXPO_PUBLIC_APP_ENV=production` and affects live account data. Never use a
service-role or secret key in an `EXPO_PUBLIC_` variable.

## SaaS implementation roadmap

The canonical phase-by-phase plan for the teacher marketplace and Bunny Stream integration is [`docs/saas-implementation-plan.md`](docs/saas-implementation-plan.md). This Codex chat owns every phase. Read the plan together with `docs/p0-engineering.md` and `docs/database-security-audit.md` before starting marketplace work.

Manually review implementation status and evidence in [`docs/saas-phase-progress.md`](docs/saas-phase-progress.md). A phase is complete only when every exit gate is checked and its CI/staging evidence is recorded.
