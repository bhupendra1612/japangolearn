# Play Store listing assets

Drop the assets you produce into the folders here. Everything in this directory
is upload material for the Google Play Console — none of it is bundled into the
app.

```
store/play/
  graphics/
    app-icon-512.png      ✅ done — generated from apps/mobile/assets/icon.png
    feature-graphic.png   ⬜ you provide — exactly 1024 × 500
  screenshots/
    01-home.png           ⬜ you provide — 2 to 8 phone screenshots
    02-vocabulary.png
    ...
```

Name screenshots with a numeric prefix. Play orders them by upload, but the
prefix keeps the intended order obvious to us.

---

## Exact requirements

| Asset | Spec | Status |
| --- | --- | --- |
| App icon | **512 × 512** px, 32-bit PNG with alpha, under 1 MB | ✅ `graphics/app-icon-512.png` |
| Feature graphic | **exactly 1024 × 500** px, JPEG or 24-bit PNG, **no alpha channel** | ⬜ needed |
| Phone screenshots | **2 minimum, 8 maximum**. JPEG or 24-bit PNG, no alpha. Each side between 320 px and 3840 px, and the longer side no more than twice the shorter | ⬜ needed |
| Short description | ≤ 80 characters | ✅ drafted below |
| Full description | ≤ 4000 characters | ✅ drafted below |

**Recommended screenshot size: 1080 × 1920** (9:16 portrait). The app is
portrait-locked, so portrait screenshots are the correct choice.

Two traps worth avoiding, because Play rejects on both:

- **No alpha channel** on the feature graphic or screenshots. A PNG saved with
  transparency is rejected even if nothing in the image is actually transparent.
  Save as JPEG, or as 24-bit PNG.
- **The feature graphic must be 1024 × 500 exactly.** Not "about". Not scaled.

Tablet and TV screenshots are optional and not needed — `supportsTablet` is
false and this is a phone app.

---

## Which screenshots to capture

Five that show the actual product, in the order they should appear:

1. **Home** — greeting, XP, streak, daily goal, and the week grid. This is the
   screen that communicates "this tracks my progress".
2. **Vocabulary browser** — the topic-grouped list with kanji, hiragana, romaji
   and the Hindi pronunciation guide visible. The Hindi guide is the genuinely
   differentiating feature; make sure it is on screen.
3. **Kanji detail with stroke order** — the strongest visual in the app.
4. **Quiz or flashcards mid-session** — shows it is interactive, not a wordlist.
5. **Achievements / trophies** — the gamification payoff.

Capture these from the **release build**, not from Expo Go, so what reviewers
see matches what installs. Use a device or emulator at 1080 × 1920.

Do not add marketing frames, device bezels, or heavy caption overlays. Plain
screenshots read as more honest and Play's own guidance prefers them.

---

## Drafted listing copy

Written against what the app actually ships today — JLPT N5 only. If you change
the JLPT scope (audit item H1), this copy has to change with it.

### Short description — 78 / 80 characters

```
Learn Japanese JLPT N5 — kanji stroke order, vocabulary, grammar, and quizzes.
```

### Full description — about 1900 / 4000 characters

```
Build a real JLPT N5 foundation in Japanese, one short session at a time.

JapanGoLearn is a free, ad-free Japanese study app for complete beginners. It
covers the full JLPT N5 syllabus — hiragana and katakana, your first 100 kanji
with stroke-order practice, 800 vocabulary words, and 50 core grammar points —
and keeps track of your progress as you go.

WHAT YOU GET

• Hiragana and katakana — all 202 characters with readings and stroke order
• 100 JLPT N5 kanji, each with animated stroke order you can trace yourself
• 800 N5 vocabulary words, grouped by topic, with kanji, hiragana and romaji
• 50 N5 grammar patterns with clear examples
• Quizzes and flashcards that turn browsing into actual recall practice
• Your own saved practice lists, built from any word or kanji

BUILT FOR HINDI SPEAKERS

Every vocabulary word carries a Hindi pronunciation guide alongside its English
meaning and romaji — so you can sound out Japanese using a script you already
read. Very few Japanese apps do this.

STAY CONSISTENT

Earn XP for every session, set a daily goal, and hold your streak. Unlock
achievements as you progress, and see your week at a glance on the home screen.
Your progress syncs with the JapanGoLearn website, so you can study on your
phone and review on a laptop.

FREE, WITH NO CATCH

No ads. No subscription. No paid tiers. No credit card. You can browse the kana
charts and vocabulary without even creating an account — sign up only when you
want your progress saved.

HONEST ABOUT SCOPE

JapanGoLearn currently covers JLPT N5, the beginner level. N4 is being written
next, and N3 to N1 will follow. If you are starting Japanese from zero, or
preparing for the N5 exam, this app is built for you. If you are already past
N5, it is worth waiting for the next content release.

PRIVACY

We do not sell your data, show third-party ads, or track you across other apps.
You can delete your account and everything in it from inside the app, or at
japangolearn.com/delete-account.

Questions or feedback: support@japangolearn.com
```

The "HONEST ABOUT SCOPE" section is deliberate. Telling N3 learners not to
install yet costs a few downloads and saves you the one-star reviews that say
"only N5 content" — which is the single most likely complaint given the current
content depth.

---

## Console fields that are not assets

Fill these while you are in there:

- **Category** — Education
- **Content rating questionnaire** — answer honestly; this app rates Everyone
- **Target audience** — 13+. This must match section 10 of the privacy policy.
  Choosing an under-13 bracket puts the app into Play's Families programme,
  which brings a much heavier compliance burden. Do not select it.
- **Data safety** — see the table below
- **Privacy policy URL** — `https://japangolearn.com/privacy`
- **App access** — provide a test account, or reviewers cannot get past signup

### Data safety answers

Verified against the code, not assumed. The app collects and links to identity:

| Data type | Collected | Purpose |
| --- | --- | --- |
| Email address | Yes | Account creation and verification |
| Name | Yes | Display name in profile |
| Photos | Yes, optional | Profile picture only, chosen by the user |
| App activity | Yes | XP, streaks, quiz results, study history |

Declare **no** for: location, contacts, calendar, financial info, health,
messages, files, installed apps, device identifiers for advertising.

Analytics and crash reporting are **not active** in version 1.0.0 — the analytics
endpoint is unset and Sentry has no DSN, so nothing is transmitted. Declare them
as not collected. If Sentry is enabled in 1.0.1, this answer and the privacy
policy both have to be updated first.

Encryption in transit: **yes**. Users can request deletion: **yes**, and the URL
is `https://japangolearn.com/delete-account`.

One thing to disclose accurately: profile photos go into a **publicly readable**
storage bucket, so anyone with the direct link can view one. This is stated in
section 3 of the privacy policy. If you would rather it not be true, make the
`avatars` bucket private and serve signed URLs — that is a code change, not a
listing change.
