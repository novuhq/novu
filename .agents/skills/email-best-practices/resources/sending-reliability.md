# Sending Reliability

Ensuring emails are sent exactly once and handling failures gracefully.

## Idempotency

Prevent duplicate emails when retrying failed requests.

### The Problem

Network issues, timeouts, or server errors can leave you uncertain if an email was sent. Retrying without idempotency risks sending duplicates.

### Solution: Idempotency Keys

Send a unique key with each request. If the same key is sent again, the server returns the original response instead of sending another email.

```typescript
// Generate deterministic key based on the business event
const idempotencyKey = `password-reset-${userId}-${resetRequestId}`;

await resend.emails.send({
  from: 'noreply@example.com',
  to: user.email,
  subject: 'Reset your password',
  html: emailHtml,
}, {
  headers: {
    'Idempotency-Key': idempotencyKey
  }
});
```

### Key Generation Strategies

| Strategy | Example | Use When |
|----------|---------|----------|
| Event-based | `order-confirm-${orderId}` | One email per event (recommended) |
| Request-scoped | `reset-${userId}-${resetRequestId}` | Retries within same request |
| UUID | `crypto.randomUUID()` | No natural key (generate once, reuse on retry) |

**Best practice:** Use deterministic keys based on the business event. If you retry the same logical send, the same key must be generated. Avoid `Date.now()` or random values generated fresh on each attempt.

**Key expiration:** Idempotency keys are typically cached for 24 hours. Retries within this window return the original response. After expiration, the same key triggers a new send—so complete your retry logic well within 24 hours.

## Retry Logic

Handle transient failures with exponential backoff.

### When to Retry

| Error Type | Retry? | Notes |
|------------|--------|-------|
| 5xx (server error) | ✅ Yes | Transient, likely to resolve |
| 429 (rate limit) | ✅ Yes | Wait for rate limit window |
| 4xx (client error) | ❌ No | Fix the request first |
| Network timeout | ✅ Yes | Transient |
| DNS failure | ✅ Yes | May be transient |

### Exponential Backoff

```typescript
async function sendWithRetry(emailData, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await resend.emails.send(emailData);
    } catch (error) {
      if (!isRetryable(error) || attempt === maxRetries - 1) {
        throw error;
      }
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      await sleep(delay + Math.random() * 1000); // Add jitter
    }
  }
}

function isRetryable(error) {
  return error.statusCode >= 500 ||
         error.statusCode === 429 ||
         error.code === 'ETIMEDOUT';
}
```

**Backoff schedule:** 1s → 2s → 4s → 8s (with jitter to prevent thundering herd)

## Error Handling

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad request | Fix payload (invalid email, missing field) |
| 401 | Unauthorized | Check API key |
| 403 | Forbidden | Check permissions, domain verification |
| 404 | Not found | Check endpoint URL |
| 422 | Validation error | Fix request data |
| 429 | Rate limited | Back off, retry after delay |
| 500 | Server error | Retry with backoff |
| 503 | Service unavailable | Retry with backoff |

### Error Handling Pattern

```typescript
try {
  const result = await resend.emails.send(emailData);
  await logSuccess(result.id, emailData);
} catch (error) {
  if (error.statusCode === 429) {
    await queueForRetry(emailData, error.retryAfter);
  } else if (error.statusCode >= 500) {
    await queueForRetry(emailData);
  } else {
    await logFailure(error, emailData);
    await alertOnCriticalEmail(emailData); // For password resets, etc.
  }
}
```

## Queuing for Reliability

For critical emails, use a queue to ensure delivery even if the initial send fails.

**Benefits:**
- Survives application restarts
- Automatic retry handling
- Rate limit management
- Audit trail

**Simple pattern:**
1. Write email to queue/database with "pending" status
2. Process queue, attempt send
3. On success: mark "sent", store message ID
4. On retryable failure: increment retry count, schedule retry
5. On permanent failure: mark "failed", alert

## Timeouts

Set appropriate timeouts to avoid hanging requests.

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  await resend.emails.send(emailData, { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
```

**Recommended:** 10-30 seconds for email API calls.

## Related

- [Webhooks & Events](./webhooks-events.md) - Process delivery confirmations and failures
- [List Management](./list-management.md) - Handle bounces and suppress invalid addresses
