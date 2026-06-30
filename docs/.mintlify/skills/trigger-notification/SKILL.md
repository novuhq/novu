---
name: novu-trigger-notification
description: Trigger Novu notification workflows to send messages across email, SMS, push, chat, and in-app channels. Supports single triggers, bulk triggers, broadcast to all subscribers, topic-based targeting, and cancellation. Use when sending transactional notifications, alerts, or any event-driven messages.
inputs:
  - name: NOVU_SECRET_KEY
    description: "Server-side API key from https://dashboard.novu.co/api-keys. Used by @novu/api."
    required: true
    type: secret
---

# Trigger Notification

Send notifications by triggering Novu workflows. Supports single, bulk, broadcast, and topic-based delivery.

## SDK Setup

```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY,
});
```

## Single Trigger

Send a notification to one subscriber:

```typescript
const result = await novu.trigger({
  workflowId: "welcome-email",
  to: "subscriber-123",
  payload: {
    userName: "Jane",
    activationLink: "https://app.example.com/activate",
  },
});
```

### Trigger with Inline Subscriber Creation

If the subscriber doesn't exist yet, provide the full object — Novu upserts the subscriber:

```typescript
const result = await novu.trigger({
  workflowId: "welcome-email",
  to: {
    subscriberId: "user-456",
    email: "jane@example.com",
    firstName: "Jane",
    lastName: "Doe",
  },
  payload: { userName: "Jane" },
});
```

### Trigger with Transaction ID

Use custom `transactionId` for idempotency:

```typescript
const result = await novu.trigger({
  workflowId: "order-update",
  to: "subscriber-123",
  payload: { orderId: "order-789" },
  transactionId: "unique-tx-id-abc",
});
```

## Bulk Trigger

Send up to **100 events** in a single request:

```typescript
const result = await novu.triggerBulk({
  events: [
    {
      workflowId: "welcome-email",
      to: "subscriber-1",
      payload: { userName: "Alice" },
    },
    {
      workflowId: "welcome-email",
      to: "subscriber-2",
      payload: { userName: "Bob" },
    },
  ],
});
```

## Broadcast

Send to **all subscribers** in the environment:

```typescript
const result = await novu.triggerBroadcast({
  // here name field is for workflowId
  name: "system-announcement",
  payload: {
    message: "Scheduled maintenance at 2am UTC",
  },
});
```

## Topic-Based Trigger

Send to all subscribers in a topic:

```typescript
const result = await novu.trigger({
  workflowId: "project-update",
  to: [{
    type: "Topic",
    topicKey: "project-alpha-watchers",
  }],
  payload: { update: "New release deployed" },
});
```

## Cancel a Trigger

Cancel delayed or digested notifications using the `transactionId`:

```typescript
await novu.cancel("unique-tx-id-abc");
```

## Trigger Parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `workflowId` | Yes | The workflow identifier (not display name) |
| `to` | Yes | Subscriber ID (string), subscriber object, or topic target |
| `payload` | No | Data passed to the workflow, validated against `payloadSchema` |
| `overrides` | No | Provider-specific overrides per channel |
| `transactionId` | No | Unique ID for idempotency and cancellation |
| `actor` | No | Subscriber ID or object representing who triggered the action |
| `context` | No | Key-value pairs for multi-tenancy / organizational context |

## Overrides

Override provider-specific settings per trigger:

```typescript
const result = await novu.trigger({
  workflowId: "alert",
  to: "subscriber-123",
  payload: { message: "Server down" },
  overrides: {
    "providers": {
      "sendgrid": {
        from: "alerts@example.com",
        cc: ["user1@example.com", "user2@example.com"],
        replyTo: "support@example.com",
      }
    }
  },
});
```

## Common Pitfalls

1. **`workflowId` is the identifier, not the display name** — use the identifier you set when defining the workflow, not its human-readable name. Novu creates workflowId automatically if not provided
2. **Subscriber upsert** — triggering to a non-existent `subscriberId` or `subscriber` object string will create the subscriber with that subscriberId.
3. **Bulk trigger limit is 100 events** — chunk larger batches into groups of 100.
4. **`transactionId` is required for cancellation** — you cannot cancel a trigger without it. Either provide custom transactionId or store novu generated transactionId if usecase is to cancel the workflow run (trigger event) later.
5. **Payload is validated against the workflow's `payloadSchema`** — if the workflow defines a schema, the trigger will fail if the payload doesn't match.

## References

- [Installation & Setup](./references/installation.md)
- [Single Trigger Examples](./references/single-trigger-examples.md)
- [Bulk Trigger Examples](./references/bulk-trigger-examples.md)
- [Topic Trigger Examples](./references/topic-trigger-examples.md)
- [Best Practices](./references/best-practices.md)
