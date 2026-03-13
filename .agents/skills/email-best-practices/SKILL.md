---
name: email-best-practices
description: Configures email authentication (SPF/DKIM/DMARC), diagnoses deliverability issues, implements compliance requirements (CAN-SPAM, GDPR, CASL), and designs reliable sending infrastructure with retry logic and suppression lists. Use when building email features, emails going to spam, high bounce rates, setting up DNS authentication, implementing email capture, handling webhooks, or deciding transactional vs marketing.
---

# Email Best Practices

Diagnose deliverability issues, configure authentication, and build compliant, reliable email infrastructure.

## Architecture Overview

```
[User] → [Email Form] → [Validation] → [Double Opt-In]
                                              ↓
                                    [Consent Recorded]
                                              ↓
[Suppression Check] ←──────────────[Ready to Send]
        ↓
[Idempotent Send + Retry] ──────→ [Email API]
                                       ↓
                              [Webhook Events]
                                       ↓
              ┌────────┬────────┬─────────────┐
              ↓        ↓        ↓             ↓
         Delivered  Bounced  Complained  Opened/Clicked
                       ↓        ↓
              [Suppression List Updated]
                       ↓
              [List Hygiene Jobs]
```

## Quick Reference

| Need to... | See |
|------------|-----|
| Set up SPF/DKIM/DMARC, fix spam issues | [Deliverability](./resources/deliverability.md) |
| Build password reset, OTP, confirmations | [Transactional Emails](./resources/transactional-emails.md) |
| Plan which emails your app needs | [Transactional Email Catalog](./resources/transactional-email-catalog.md) |
| Build newsletter signup, validate emails | [Email Capture](./resources/email-capture.md) |
| Send newsletters, promotions | [Marketing Emails](./resources/marketing-emails.md) |
| Ensure CAN-SPAM/GDPR/CASL compliance | [Compliance](./resources/compliance.md) |
| Decide transactional vs marketing | [Email Types](./resources/email-types.md) |
| Handle retries, idempotency, errors | [Sending Reliability](./resources/sending-reliability.md) |
| Process delivery events, set up webhooks | [Webhooks & Events](./resources/webhooks-events.md) |
| Manage bounces, complaints, suppression | [List Management](./resources/list-management.md) |

## Start Here

**New app?**
Start with the [Catalog](./resources/transactional-email-catalog.md) to plan which emails your app needs (password reset, verification, etc.), then set up [Deliverability](./resources/deliverability.md) (DNS authentication) before sending your first email.

**Spam issues?**
Check [Deliverability](./resources/deliverability.md) first—authentication problems are the most common cause. Gmail/Yahoo reject unauthenticated emails.

**Marketing emails?**
Follow this path: [Email Capture](./resources/email-capture.md) (collect consent) → [Compliance](./resources/compliance.md) (legal requirements) → [Marketing Emails](./resources/marketing-emails.md) (best practices).

**Production-ready sending?**
Add reliability: [Sending Reliability](./resources/sending-reliability.md) (retry + idempotency) → [Webhooks & Events](./resources/webhooks-events.md) (track delivery) → [List Management](./resources/list-management.md) (handle bounces).

## Core Pattern: Idempotent Send with Suppression Check

```typescript
async function sendEmail(to: string, idempotencyKey: string, payload: EmailPayload) {
  // 1. Check suppression list before sending
  if (await isOnSuppressionList(to)) {
    return { status: "suppressed", reason: "recipient on suppression list" };
  }

  // 2. Deduplicate with idempotency key
  if (await alreadySent(idempotencyKey)) {
    return { status: "duplicate", idempotencyKey };
  }

  // 3. Send with retry
  const result = await sendWithRetry(payload, { maxRetries: 3, backoff: "exponential" });

  // 4. Record for idempotency
  await recordSent(idempotencyKey, result);
  return result;
}
```
