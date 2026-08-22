# Handoff — JapanGoLearn mobile, Play Store launch prep

Written 2026-08-19. Context for whoever picks this up next.

The goal of this stretch of work was to get `apps/mobile` ready to publish on
the Google Play Store, and to fix auth (login / logout / registration) which
was misbehaving.

---

## 1. Project facts you need

| Thing | Value |
| --- | --- |
| Monorepo | pnpm workspaces + turbo, 13 packages |
| Mobile | Expo SDK 54, React Native 0.81.5, expo-router 6, React 19, New Arch + Hermes |
| App name / package | `JapanGoLearn` / `com.japangolearn.app` |
| EAS project | `@robinsingh24/japangolearn`, id `292004a3-77c6-4d6b-80f7-59cb1fab1d57` |
| Supabase project | ref `teylstfbjtutssnfmhhu` (named "japanese"), region ap-south-1 |
| Domain | `japangolearn.com`, on Cloudflare DNS, web/admin/api deployed as Cloudflare Workers |
| Branch | `codex/phase-0-foundation` |

**There is only ONE Supabase project.** No staging/dev project exists. This
matters — see §6.

**Another session is working in this repo concurrently** (web dashboard: review
/ saved / search routes, several new migrations). Those changes are not mine.
Check `git status` before assuming ownership of a file.

---

## 2. Auth rewrite — the important part

### The bug

Login, logout and registration all failed intermittently for one root cause:
the app mixed declarative `<Stack.Protected>` guards with imperative
`router.replace()` calls.

Confirmed by reading expo-router's source: `useSortedScreens` **filters guarded
routes out of the navigator entirely** when a guard flips false. So at the
moment a session appears, the `(auth)` group is deleted from the navigator
while `login.tsx` is calling `router.replace()` from inside it. React
Navigation silently drops actions aimed at unregistered screens.

### The fix — single redirect authority

`app/index.tsx` is now the **only** place that decides where an authenticated
or unauthenticated user goes. It is never guarded, so it is always a safe
navigation target. Every auth transition does `router.replace("/")` and lets
index route onward.

Destination intent (deep-link `redirectTo`) is handed over via
`setPendingRedirect()` / `consumePendingRedirect()` in `lib/auth-navigation.ts`
— a module-level variable, because the auth screen is being unmounted and
cannot navigate itself.

**Do not reintroduce direct `router.replace("/(tabs)")` or
`router.replace("/(auth)/login")` after an auth state change.** It will look
like it works and fail intermittently.

### Other auth bugs fixed at the same time

- `Sidebar.tsx` sign-out sent users to `/onboarding`, whose only exit is guest
  mode — users could not reach login after logging out. Both sign-out paths now
  go through `/`.
- `AuthPromptModal` called `exitGuestMode()` before navigating, unmounting
  `(tabs)` from under itself. Guest mode is now left alone; signing in clears it.
- `index.tsx` marked onboarding complete *before* showing it, so quitting
  mid-carousel skipped it forever. Now marked on actual exit (`onboarding.tsx`).
- `fetchProfile` in `lib/auth.tsx` discarded errors — a failed profile fetch
  left users signed in with a blank profile and no diagnostic. Now reported via
  `captureException`.
- `app/study/` had no `_layout.tsx`, so `<Stack.Screen name="study" />` in the
  root layout matched nothing and flashcards/quiz were **never protected**.
  Added `app/study/_layout.tsx`.

---

## 3. What else was built

### Account deletion (Play Store requirement)

- `supabase/migrations/20260813120000_add_delete_account_rpc.sql` — `SECURITY
  DEFINER` RPC `public.delete_account()`. **Already applied to production.**
  Hard-deletes `auth.users` (cascades everywhere); if retained records block it
  (`course_orders` is `ON DELETE RESTRICT`, `blog_posts.author_id` is
  `NO ACTION`, published courses via `teacher_profiles`) it falls back to
  anonymising the profile and locking the auth row instead.
- Mobile: "Delete Account" in Profile, two-step confirm.
- Web: public `/delete-account` page (in the `(marketing)` group so it is
  reachable signed-out — Play requires a web-accessible deletion path), linked
  from the footer.

### Email OTP signup verification

Signup is email + password + JLPT level, then a **6-digit code** (not a magic
link) entered in-app. `verifyOtp({ type: "signup" })`. Resend with 60s cooldown.
Same flow on web.

Duplicate-signup handling has **two distinct cases** — this is subtle:

- **Confirmed account exists** → Supabase returns success with an **empty
  `identities` array** and sends nothing (deliberate anti-enumeration). Detected
  and surfaced as "This email is already registered. Please sign in instead."
- **Unconfirmed account exists** → Supabase returns a normal user *with*
  identities and genuinely resends a code. The `identities` check cannot see
  this. Detected instead by `created_at` predating the request; shows the code
  screen with "already registered but never verified".

Surfacing "already registered" is a deliberate tradeoff — it enables email
enumeration, which Supabase hides by default. The owner chose this for UX.

### Security / hardening

- Auth tokens moved from plain `AsyncStorage` to `expo-secure-store`
  (`lib/secure-storage.ts`). Values are **chunked at 1800 bytes** (SecureStore
  warns past ~2048 and Supabase sessions can exceed it) and the first read
  **migrates** an existing AsyncStorage session across so nobody is logged out
  by the upgrade. Web falls back to AsyncStorage (SecureStore has no web impl).
- `components/ErrorBoundary.tsx` added and wired into `app/_layout.tsx`.
  `Sentry.wrap()` reports crashes but renders no fallback — this prevents a
  white screen.

### Branding

- Renamed from `EasyJapanese` / `com.easyjapanese.app` (that name was already
  taken on Play). App name, bundle id, package, URL scheme, and all in-app text.
- Icon set regenerated from the owner's logo. **Adaptive foreground is scaled to
  62%** because Android masks to a circle and only the centre ~66% is
  guaranteed visible — a straight resize clipped the torii and blossom. Verified
  by rendering a simulated launcher crop. Monochrome themed icon regenerated as
  a line-art silhouette.
- `apps/mobile/assets/logo.png` used in login, signup, sidebar, about.
- `about.tsx` was an unrelated software agency page ("Trading Tech", algorithmic
  trading services, a personal phone number). Fully rewritten, plus a Legal
  section linking Privacy / Terms / Delete Account.

### Build hygiene

- Removed dead native deps: `expo-av`, `expo-haptics`, `expo-sqlite`,
  `react-native-webview`, `react-native-worklets-core` (all verified zero
  imports). Kept `react-native-reanimated` / `gesture-handler` /
  `react-native-worklets` — unused directly but required by React Navigation.
- `android.blockedPermissions` strips CAMERA, RECORD_AUDIO, READ_MEDIA_VIDEO,
  SYSTEM_ALERT_WINDOW, WRITE_EXTERNAL_STORAGE. `expo-image-picker` injects
  CAMERA unconditionally even though only the photo library is used.
  **Verified via a real `expo prebuild`** that the final manifest carries
  `tools:node="remove"` on each. Shipping permissions are: INTERNET,
  MODIFY_AUDIO_SETTINGS, READ_EXTERNAL_STORAGE, VIBRATE.
- `expo install --fix` run; `expo install --check` reports clean.
- targetSdk 36 (Play requires ≥35 for new apps).

---

## 4. Verified vs not verified

**Verified by me:**
- Guest flow end-to-end in a running app (onboarding → skip → tabs, correct tab
  gating, zero "action was not handled by any navigator" warnings)
- Eye toggles on mobile login + signup actually flip the field
- JLPT dropdown opens, selects, closes, updates
- OTP screen renders; input strips non-digits and caps at 6
- Production export builds (5.5 MB Hermes bundle)
- Final Android manifest permissions (via prebuild)
- typecheck + lint clean on mobile and web throughout

**Verified by the owner on device:**
- Signup → OTP email → verify → session → profile row created

**NOT verified:**
- Login and sign-out on a real device after the navigation rewrite. I cannot
  enter passwords, so the owner must confirm. Sign out from **both** Profile and
  the Sidebar — those were separate code paths.

---

## 5. Remaining before launch

1. **Store listing assets** — nothing exists. Screenshots (2–8), feature graphic
   **exactly 1024×500**, short description (≤80 chars), full description
   (≤4000). Done in Play Console.
2. **Deploy the web app.** The email logo (`japangolearn.com/email-logo.png`)
   and the About screen's Privacy / Terms / Delete Account links all 404 until
   then. Play requires a live privacy policy URL and the deletion URL.
3. **Confirm login / sign-out on device** (see §4).
4. **Revert `apps/mobile/.env.local`** — see §6.
5. Build and upload:
   `pnpm exec eas build --platform android --profile production`
   Upload the AAB manually the first time; a service account cannot create the
   first release of a new app.
6. Optionally delete leftover test accounts, keeping the admin
   (`b76109dna@gmail.com`, the only `role = admin`).

**Deferred by owner decision:** Sentry. `EXPO_PUBLIC_SENTRY_DSN` is not set in
the EAS production environment, so crash reporting is dark for v1. Play Console
Android Vitals still gives crashes/ANRs. Add in 1.0.1.

---

## 6. Gotchas that will waste your time

**`.env.local` is deliberately wrong.** `packages/environment` throws if a
non-production `appEnv` points at the production Supabase ref. Since there is no
dev/staging project, `EXPO_PUBLIC_APP_ENV` was set to `production` locally so
the app would run at all. **Local dev talks to the real database.** EAS builds
are unaffected (they use the EAS environment). Revert with:
`pnpm exec eas env:pull development --path .env.local --non-interactive`

**Supabase email templates are auth service config, not database.** They cannot
be applied by migration and are not reachable through the Supabase MCP tools.
They must be pasted in the dashboard. See `docs/supabase-email-templates.md` and
`docs/email-templates/confirm-signup.html`.

**Cloudflare SMTP specifics** (Email Sending beta, needs Workers Paid — the
account has it): host `smtp.mx.cloudflare.net`, port **465 only** (implicit TLS;
587/STARTTLS is rejected), username is the **literal string `api_token`**,
password is a Cloudflare API token with `Email Sending: Edit`.

**Supabase enforces its own email rate limit** (default 30/hour, was 2/hour on
the built-in sender) on top of whatever the provider allows —
Authentication → Rate Limits.

**`packages/database/src/supabase.types.ts` is stale.** It is missing
`create_course_order`, `enroll_free_course`, `fulfill_course_order`,
`review_teacher_application`, `submit_teacher_application`. Those RPCs exist
live but any code calling them is untyped. `delete_account` was added by hand
and matches the generated signature. Worth a full regen.

**OTA is enabled** (`updates.url` present, `runtimeVersion.policy = appVersion`).
Because runtime version is tied to app version, **bumping `version` in app.json
stops OTA reaching existing installs** until they update from Play. Keep
`version` unchanged for JS-only hotfixes. Push with
`pnpm run update:production`.

**`eas.json` uses `appVersionSource: "remote"`** with `autoIncrement` on the
production profile — versionCode is managed on EAS servers.

**Do not edit files while the owner is testing on Expo Go.** Metro hot-reloads
partial saves onto the device; this produced a `SyntaxError` and a
`ReferenceError` that looked like real auth bugs and cost a debugging round.

---

## 7. Useful commands

```bash
# mobile checks (run from apps/mobile — the --filter form has hit a pnpm bug)
pnpm exec tsc --noEmit
pnpm exec eslint . --max-warnings=0

# dev server for Expo Go (QR: the LAN IP changes between sessions — check it)
pnpm exec expo start --port 8081 --clear

# production bundle smoke test
pnpm exec expo export --platform android --output-dir /tmp/export-check

# inspect the real Android manifest, then delete android/ (project is CNG)
pnpm exec expo prebuild --platform android --no-install --clean
# NOTE: prebuild rewrites the android/ios npm scripts to `expo run:*` — revert them
```
