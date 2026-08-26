# Marketplace MVP manual test

This checklist verifies the current JapanGoLearn marketplace vertical slice without Docker and
without requiring a second Supabase project.

Do not paste secret values into this file, Git, screenshots, or issue comments.

## What is implemented

- One Supabase Auth account can learn as a student and apply to become a teacher.
- Admin teacher approval and audit logging.
- Free and paid course records, sections, article/video lessons, and publishing.
- Bunny Stream direct TUS upload through a short-lived authorization created by the Cloudflare API.
- Public web catalog, free enrollment, pending paid orders, and a student course library.
- Expo course catalog with free enrollment and paid-order creation.
- Atomic paid-order fulfillment function for a future payment webhook.

Real money is not collected yet. Selecting **Buy course** creates a pending order only. A payment
provider must be selected and connected before paid checkout can be considered complete.

## One-time owner setup

### 1. Review and apply the Supabase migration

The migration is:

`supabase/migrations/20260723121053_marketplace_mvp.sql`

From the repository root, first confirm the linked project:

```powershell
pnpm exec supabase projects list
pnpm exec supabase db push --dry-run --include-all
```

The dry run must list only `20260723121053_marketplace_mvp.sql`. Applying it changes the linked
Supabase database, so run the following only after confirming the correct project:

```powershell
pnpm exec supabase db push --include-all
```

### 2. Confirm an admin account

The existing admin app still recognizes `profiles.role = 'admin'`. In Supabase Table Editor, open
`public.profiles`, find your admin user, and confirm its `role` is `admin`.

The migration copies existing scalar admins into `public.user_roles`; new students are added to
`user_roles` automatically.

### 3. Configure Bunny Stream

Use one Bunny Stream library for the current environment. Copy its **Library ID** and **Stream API
key**. Do not expose the API key in a web or Expo variable.

For the first deployment, run the secure setup helper from the repository root:

```powershell
pnpm deploy:api:setup
```

The helper reads the existing Supabase URL and public key from `apps/web/.env.local`, reads the
existing Cloudflare API token from the root `.env.local`, and prompts locally for the Bunny Library
ID and Stream API key. It sends all four required secrets with the first Worker deployment and
deletes its temporary secret file immediately. The Bunny API key input is hidden.

Do not paste the Bunny API key into chat, source files, screenshots, GitHub issues, or any
`NEXT_PUBLIC_*`/`EXPO_PUBLIC_*` variable.

### 4. Configure the web-to-API URL

For local use:

```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8787
```

For deployment, set it to the deployed `japangolearn-api` Worker URL. Also set the API Worker's
`ALLOWED_ORIGINS` value to the exact web origin. The current MVP configuration also allows the
exact local origins `http://localhost:3000` and `http://127.0.0.1:3000` so the deployed API can be
tested from the local web app. Never use `*` for authenticated upload requests.

## Local manual test

Run these in separate terminals:

```powershell
pnpm dev:api
pnpm dev:web
pnpm dev:admin
pnpm dev:mobile
```

### Student and teacher flow

1. Create account A on `/signup`, confirm its email, and sign in.
2. Open `/dashboard/teacher`.
3. Save a teacher profile and submit it.
4. Sign into the admin app with an existing admin account.
5. Open `/teachers`, review account A, and select **Approve teacher**.
6. Return to account A and refresh `/dashboard/teacher`.
7. Create a free course draft.
8. Add a section and an article lesson.
9. Select a video file under **Upload video to Bunny**.
10. Wait for upload completion, refresh, and attach the video asset to a video lesson.
11. Publish the course.
12. Open `/courses` in a signed-out browser and confirm only the published course appears.
13. Create student account B, open the course, and select **Enroll free**.
14. Confirm the course appears at `/dashboard/courses`.
15. Open the Expo **Courses** tab with account B and confirm the same course/account access appears.

### Paid-order safety flow

1. With account A, create and publish a paid course with a positive INR price.
2. With account B, select **Buy course** on web or Expo.
3. Confirm a row appears in `public.course_orders` with `status = 'pending'`.
4. Confirm no `course_entitlements` row is created for that paid course.

This proves that starting checkout cannot grant unpaid access. Do not manually set an order to
`paid`; entitlement finalization is reserved for the service-role payment webhook function.

## Manual result record

- Reviewer:
- Date:
- Supabase project ref checked:
- Web result:
- Admin result:
- Expo result:
- Bunny upload result:
- Free enrollment result:
- Paid pending-order result:
- Issues found:
