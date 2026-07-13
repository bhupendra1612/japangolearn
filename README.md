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

Copy `.env.example` to `.env.local` for web/admin development and to `apps/mobile/.env` for mobile development, then fill in the public key locally.
