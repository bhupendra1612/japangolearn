# ADR 0006: Bunny Stream video

- Status: Accepted architecture
- Revision date: 2026-07-22
- Owner approval: Bunny account and dedicated library creation still required

## Context

Course video requires upload, transcoding, captions, thumbnails, and entitlement-gated playback without storing provider details throughout the domain.

## Decision

Use Bunny Stream through the `VideoProvider` port. Uploads use server-signed direct TUS grants. Playback uses short-lived signed access issued only after an entitlement check. Staging and production use different libraries and keys.

## Consequences

Bunny credentials remain server-only, webhook handling must be idempotent, and provider IDs live behind media assets. Local and test use `FakeVideoProvider`.

## Alternatives

Direct application uploads, public playback URLs, and storing course videos in Supabase Storage were rejected for scale, security, or coupling reasons.
