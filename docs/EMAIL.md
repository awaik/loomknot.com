# Email Sending (Resend)

## Provider

**Resend** — transactional email service. SDK: `resend` (npm), v6+.

## Configuration

| Setting | Value |
|---------|-------|
| **Verified domain** | `loomknot.com` (in Resend dashboard) |
| **From address** | `Loomknot <noreply@loomknot.com>` |
| **Constant** | `EMAIL_FROM` in `packages/shared/src/constants/index.ts` |
| **API key env** | `RESEND_API_KEY` (in `.env.backend`) |

## DNS Records (Cloudflare — DNS Only, no proxy)

| Type | Name | Content | Priority |
|------|------|---------|----------|
| TXT | `resend._domainkey` | DKIM public key (from Resend) | — |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |

**Important:** All records MUST be "DNS Only" (grey cloud) in Cloudflare. Proxy breaks email DNS.

- **DKIM** — on root domain (`resend._domainkey.loomknot.com`)
- **SPF + MX** — on `send` subdomain (`send.loomknot.com`) — used for bounce handling
- **From address** uses root domain (`noreply@loomknot.com`) — verified via DKIM

## Resend SDK v6+ — Error Handling

The SDK does NOT throw exceptions on API errors. It returns `{ data, error }`:

```typescript
// WRONG — error silently swallowed
await resend.emails.send({ ... });

// CORRECT — check error explicitly
const { data, error } = await resend.emails.send({ ... });
if (error) {
  logger.error(`Failed to send email: ${error.message}`);
}
```

## Email Types

### 1. Magic Link PIN (Auth)
- **File:** `apps/api/src/auth/auth.service.ts` → `sendMagicLink()`
- **Trigger:** `POST /api/v1/auth/send-magic-link`
- **Subject:** `{PIN} — your Loomknot sign-in code`
- **PIN TTL:** 10 minutes (Redis)

### 2. Project Invite
- **File:** `apps/api/src/projects/projects.service.ts` → `sendInviteEmail()`
- **Trigger:** `POST /api/v1/projects/:id/invites` (create) or `.../resend` (resend)
- **Subject:** `You're invited to join "{title}" on Loomknot`
- **Token expiry:** 7 days
- **Resend cooldown:** 2 hours between resends

### 3. Test Email (temporary diagnostic endpoint)
- **File:** `apps/api/src/auth/auth.controller.ts` → `testEmail()`
- **Endpoint:** `GET /api/v1/auth/test-email`
- **Recipient:** hardcoded `awaiking44@gmail.com`
- **Purpose:** Verify Resend integration works. Remove after confirmation.

## Dev Mode

When `RESEND_API_KEY` is not set, emails are logged to console instead of sent:
```
[DEV] Magic PIN for user@example.com: 123456
[DEV] Invite token for user@example.com: abc123...
```
