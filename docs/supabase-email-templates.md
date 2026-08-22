# Supabase email templates — JapanGoLearn

Signup confirmation uses a **6-digit code**, not a magic link, so users never
leave the app. That requires two things in the Supabase dashboard:

1. The **Confirm signup** template must render `{{ .Token }}` (the 6-digit code)
   instead of `{{ .ConfirmationURL }}`.
2. **Custom SMTP must be configured**, otherwise Supabase's built-in sender is
   capped at a few emails per hour and most signups will silently fail.

Templates live in auth service config, not the database, so they cannot be
applied by migration — paste them in by hand.

---

## 1. Configure SMTP (do this first)

Supabase Dashboard → **Project Settings → Authentication → SMTP Settings** →
enable *Custom SMTP*.

### Cloudflare Email Sending — the one we use

Email *Routing* is inbound-only and cannot send. Email *Sending* (public beta
since 2026-04-16) provides SMTP. Both prerequisites are already met: the
account is on **Workers Paid**, and `japangolearn.com` is on Cloudflare DNS.
Includes 3,000 emails/month, then $0.35 per 1,000.

**Step 1 — onboard the domain.** Cloudflare dashboard → **Compute → Email
Service → Email Sending** → *Onboard Domain* → pick `japangolearn.com`.
Cloudflare adds the MX (bounce handling), SPF, DKIM and DMARC records itself.
Review, then *Done*. Propagation is usually 5–15 minutes on Cloudflare DNS.

**Step 2 — create the credential.** My Profile → **API Tokens** → create a
token with the **Email Sending: Edit** permission. Treat it as a password:
anyone holding it can send from any onboarded domain on the account.

**Step 3 — SMTP settings in Supabase:**

| Field | Value |
| --- | --- |
| Host | `smtp.mx.cloudflare.net` |
| Port | `465` (implicit TLS / SMTPS) |
| Username | the literal string `api_token` |
| Password | the API token from step 2 |
| Sender email | `no-reply@japangolearn.com` |
| Sender name | `JapanGoLearn` |

Cloudflare supports **only** port 465 with implicit TLS — plaintext port 25 and
STARTTLS on 587 are rejected. If Supabase cannot connect, confirm it is set to
465/SSL rather than 587/STARTTLS before assuming the token is wrong.

Other limits worth knowing: 50 recipients per SMTP session, 5 MiB message size.

### Brevo (free fallback — 300 emails/day, no card)

After verifying `japangolearn.com` under Brevo → *Senders, Domains & Dedicated IPs*:

| Field | Value |
| --- | --- |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | your Brevo SMTP login (shown under *SMTP & API*) |
| Password | your Brevo SMTP key |
| Sender email | `no-reply@japangolearn.com` |
| Sender name | `JapanGoLearn` |

Note Brevo's 300/day is shared across marketing and transactional mail.

### Alternatives

| Provider | Free tier | Host / Port |
| --- | --- | --- |
| Mailjet | 6,000/mo (200/day) | `in-v3.mailjet.com` : `587` |
| Resend | 3,000/mo (100/day) | `smtp.resend.com` : `465` |

Whichever you pick, the sender domain must be verified with that provider or
mail will be rejected.

Google is a poor fit: plain Gmail SMTP rewrites the `From` header to the Gmail
address, so codes would arrive from a personal address rather than
`no-reply@japangolearn.com`, and it is capped around 500/day. Sending as the
domain needs Google Workspace SMTP relay, which costs more than Cloudflare.

### Then raise Supabase's own rate limit

Supabase applies a **30 emails per hour** cap of its own once custom SMTP is
enabled — independent of whatever the provider allows. Signups will start
failing at 30/hour until this is raised under
**Authentication → Rate Limits → Emails sent per hour**.

While you are there, under **Authentication → Providers → Email**, confirm
*Confirm email* is enabled, and set **OTP expiry** to `3600` seconds or less
(Supabase's security advisor flags anything longer).

---

## 2. Confirm signup template

Dashboard → **Authentication → Email Templates → Confirm signup**.

Subject:

```
Your JapanGoLearn verification code
```

Body — replace the whole template with this:

```html
<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,0.08);">

            <!-- Logo -->
            <tr>
              <td align="center" style="padding:32px 32px 8px 32px;">
                <img
                  src="https://japangolearn.com/email-logo.png"
                  width="72"
                  height="72"
                  alt="JapanGoLearn"
                  style="display:block;border:0;border-radius:16px;"
                />
              </td>
            </tr>

            <!-- Heading -->
            <tr>
              <td align="center" style="padding:8px 32px 0 32px;">
                <h1 style="margin:0;font-size:22px;line-height:30px;font-weight:700;color:#101828;">
                  Confirm your email
                </h1>
                <p style="margin:10px 0 0 0;font-size:15px;line-height:22px;color:#475467;">
                  Enter this code in the JapanGoLearn app to activate your account.
                </p>
              </td>
            </tr>

            <!-- Code -->
            <tr>
              <td align="center" style="padding:28px 32px;">
                <div style="display:inline-block;background-color:#f9f5ff;border:1px solid #e9d7fe;border-radius:12px;padding:18px 28px;">
                  <span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:#6941c6;">
                    {{ .Token }}
                  </span>
                </div>
              </td>
            </tr>

            <!-- Meta -->
            <tr>
              <td align="center" style="padding:0 32px 28px 32px;">
                <p style="margin:0;font-size:13px;line-height:20px;color:#667085;">
                  This code expires in 60 minutes. If you didn't create a
                  JapanGoLearn account, you can safely ignore this email.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding:20px 32px;border-top:1px solid #eaecf0;background-color:#fcfcfd;">
                <p style="margin:0;font-size:12px;line-height:18px;color:#98a2b3;">
                  JapanGoLearn &middot;
                  <a href="https://japangolearn.com" style="color:#6941c6;text-decoration:none;">japangolearn.com</a>
                </p>
                <p style="margin:6px 0 0 0;font-size:12px;line-height:18px;color:#98a2b3;">
                  一歩一歩、前へ進もう
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 3. Notes

- `{{ .Token }}` is the 6-digit code. Do **not** also include
  `{{ .ConfirmationURL }}` — a link in the same mail lets users confirm through
  the browser, which skips the in-app verification screen.
- The logo is served from `apps/web/public/email-logo.png`, so it only renders
  once the web app is deployed to `japangolearn.com`. Until then the alt text
  shows instead. Gmail strips base64 images, which is why this is a hosted URL
  rather than an inline attachment.
- Table-based layout with inline styles is deliberate: Outlook and Gmail strip
  `<style>` blocks and ignore most modern CSS.
- The same 6-digit approach can later be applied to the **Magic Link** template
  if passwordless sign-in is added.
