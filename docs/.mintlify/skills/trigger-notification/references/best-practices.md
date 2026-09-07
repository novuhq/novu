# Best Practices

> Designing the workflow itself (channels, severity, `critical`, digest, conditions, templates)? See [`design-workflow/`](../../design-workflow). This file covers **trigger-side** best practices only — idempotency, retries, payload design, and topic vs bulk choice.

## Idempotency

`transactionId` is unique to each workflow trigger (event). Novu generates unique transactionId if not provided during trigger. It can be used for idempotennt workflow run and to cancel the pending workflow run later

```typescript
import { randomUUID } from "crypto";

const result = await novu.trigger({
  workflowId: "order-confirmation",
  to: "customer-123",
  payload: { orderId: "order-001" },
  transactionId: `order-confirmation-order-001`, // deterministic ID prevents duplicates
});
```

**Deterministic IDs** (based on the event context) are preferred over random UUIDs — they naturally prevent duplicate triggers for the same event.

## Error Handling

```typescript
try {
  const result = await novu.trigger({
    workflowId: "welcome-email",
    to: "subscriber-123",
    payload: { userName: "Jane" },
  });
  console.log("Triggered successfully:", result);
} catch (error) {
  if (error.statusCode === 422) {
    console.error("Validation error — check payload schema:", error.message);
  } else if (error.statusCode === 401) {
    console.error("Authentication failed — check NOVU_SECRET_KEY");
  } else if (error.statusCode === 404) {
    console.error("Workflow not found — check workflowId");
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## Retry Strategy

For transient failures (5xx errors, network timeouts), use exponential backoff:

```typescript
async function triggerWithRetry(
  novu: Novu,
  params: TriggerParams,
  maxRetries = 3
) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await novu.trigger(params);
    } catch (error) {
      const isRetryable = error.statusCode >= 500 || error.code === "ECONNRESET";
      if (!isRetryable || attempt === maxRetries) throw error;

      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
```

**Non-retryable errors** (do not retry):
- `401` — Invalid API key
- `404` — Workflow not found
- `422` — Payload validation failure

## Payload Design

- Keep payloads small — include IDs and references, not full objects
- Use the workflow's `payloadSchema` to enforce structure
- Avoid sensitive data in payloads (they may be logged/stored)

```typescript
// Good: reference IDs
{ orderId: "order-001", userId: "user-123" }

// Avoid: full objects with sensitive data
{ order: { id: "order-001", creditCard: "4111..." } }
```

## Topic vs. Bulk Triggers

| Use Case | Approach |
| --- | --- |
| Same notification to a group | Topic trigger |
| Different payloads per subscriber | Bulk trigger |
| All subscribers in the environment | Broadcast |
| More than 100 unique events | Chunked bulk triggers |
