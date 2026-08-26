# API v1 and provider standards

All marketplace endpoints live below `/api/v1`. Contracts are runtime-validated in `packages/api-contracts` and provider integrations implement the interfaces in `packages/providers`.

Success responses contain `data` and `meta.requestId`. Errors contain a stable application code, safe message, request ID, and structured details. Raw database, Supabase, Cloudflare, Bunny, payment, or notification errors must not be returned.

Resource IDs are UUIDs, timestamps are UTC ISO 8601 strings, list endpoints use bounded cursor pagination, and money uses integer minor units plus an uppercase ISO currency code. Retry-sensitive commands require an idempotency key. Auth, upload, playback, and commerce endpoints use the named rate-limit policies exported by the contracts package.

Local tests use `FakeVideoProvider`, `FakePaymentProvider`, `FakeNotificationProvider`, and `FakeObjectStorageProvider`; they make no network calls. Real adapters must keep credentials in `apps/api` server bindings and must never be imported by browser or mobile bundles.

Public feature flags control visibility only. They are not evidence of identity, permission, ownership, enrollment, or entitlement.
