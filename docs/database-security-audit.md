# Database security audit

Scope: all application tables in `public`, callable functions in `public` and
`private`, explicit API grants, and the `avatars` Storage bucket.

## Policy matrix

| Data group                                             | Anonymous           | Authenticated owner                                              | Admin                                 | Direct writes                                             |
| ------------------------------------------------------ | ------------------- | ---------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------- |
| Profiles                                               | None                | Select self; update display name, avatar, JLPT level, onboarding | Select all through RLS                | XP, streak, and role columns are not granted              |
| JLPT/content/achievements                              | Select              | Select                                                           | Insert, update, delete                | Controlled by admin RLS                                   |
| Published blog                                         | Published rows only | Published rows                                                   | All rows and content writes           | Controlled by admin RLS                                   |
| Contact submissions                                    | Insert              | Insert                                                           | Select and update                     | Delete is not granted                                     |
| Daily goals/activity/XP/attempts/events/mastery/quests | None                | Select own rows                                                  | Select all rows                       | Server-owned; clients have no insert/update/delete grants |
| User achievements and level/kana/kanji progress        | None                | Select own rows                                                  | Select all rows                       | Server-owned in this phase                                |
| Practice lists and items                               | None                | Owner CRUD                                                       | Select through ownership/admin policy | Owner IDs are checked by RLS                              |

Every public application table has RLS enabled. User-keyed policy columns and
foreign keys have supporting indexes. Policies use `(select auth.uid())` and the
fixed-search-path `private.is_admin()` function to avoid repeated per-row function
evaluation.

## Functions

- `private.set_updated_at()` is a trigger-only invoker function.
- `private.handle_new_user()` is a trigger-only `SECURITY DEFINER` function with
  `search_path = ''`; neither trigger function is executable by API roles.
- `private.is_admin()` is `SECURITY DEFINER`, has `search_path = ''`, and is
  executable only by authenticated and service roles for RLS evaluation.
- `public.award_xp()` is `SECURITY DEFINER`, has `search_path = ''`, validates the
  authenticated user and score, applies a daily cap, and is idempotent by user and
  attempt key.
- `public.increment_streak()` remains temporarily for mobile compatibility. It is
  authenticated, fixed-search-path, and cannot select or mutate another user.
- `public.track_analytics_event()` accepts only the documented taxonomy, limits
  property size, derives the user from the JWT, and has a fixed search path.

No protected function is executable by `PUBLIC` or `anon`.

## Storage

The `avatars` bucket serves public object URLs and restricts MIME type and size without
granting broad object-list access. Authenticated users can list only their own objects.
Uploads must use a folder owned by the JWT user. Updates and deletes require
`storage.objects.owner_id` to match `auth.uid()`. The application now writes objects
as `<user-id>/avatar.<extension>`, while the insert policy temporarily accepts the
old `avatars/<user-id>/...` layout for compatibility.

## Automated enforcement

`pnpm db:security:audit` fails when:

- a public table does not have RLS enabled;
- a `SECURITY DEFINER` function lacks an explicit search path;
- any `SECURITY DEFINER` function is executable by `PUBLIC` or `anon`;
- an API role can write to a server-owned attempt, event, XP, mastery, quest, or
  compatibility-projection table; or
- any required avatar Storage policy is absent.

The audit runs after a clean local database reset in CI. Production should apply the
same migrations before enabling the linked-schema type drift gate.
