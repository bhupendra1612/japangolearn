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

This repo is prepared to use the existing Supabase project:

- project ref: `teylstfbjtutssnfmhhu`
- dashboard: `https://supabase.com/dashboard/project/teylstfbjtutssnfmhhu`
- public URL: `https://teylstfbjtutssnfmhhu.supabase.co`

Copy `.env.example` to `.env.local` for web/admin development. For mobile development, pull the configured EAS development environment into the ignored app-local file:

```bash
pnpm --filter @japangolearn/mobile exec eas env:pull development --path .env.local --non-interactive
```

Mobile preview and production updates use their matching EAS environments through the root release scripts.

## SaaS implementation roadmap

The canonical phase-by-phase plan for the teacher marketplace and Bunny Stream integration is [`docs/saas-implementation-plan.md`](docs/saas-implementation-plan.md). This Codex chat owns every phase. Read the plan together with `docs/p0-engineering.md` and `docs/database-security-audit.md` before starting marketplace work.

Manually review implementation status and evidence in [`docs/saas-phase-progress.md`](docs/saas-phase-progress.md). A phase is complete only when every exit gate is checked and its CI/staging evidence is recorded.
