---
name: novu-manage-subscribers
description: Create, update, search, and delete subscribers in Novu. Manage topics for group-based notification targeting. Set subscriber credentials for push and chat channels. Use when managing notification recipients, creating subscriber records, organizing subscribers into topics, or configuring channel-specific credentials.
inputs:
  - name: NOVU_SECRET_KEY
    description: "Server-side API key from https://dashboard.novu.co/api-keys. Used by @novu/api."
    required: true
    type: secret
---

# Manage Subscribers

Subscribers are the recipients of your notifications. Each subscriber has a unique `subscriberId` — typically your application's user ID.

## SDK Setup

```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY,
});
```

## Create a Subscriber

```typescript
await novu.subscribers.create({
  subscriberId: "user-123",       // required — your system's user ID
  email: "jane@example.com",      // optional
  firstName: "Jane",              // optional
  lastName: "Doe",                // optional
  phone: "+15551234567",          // optional
  avatar: "https://example.com/jane.jpg",  // optional
  locale: "en-US",                // optional
  timezone: "America/New_York",   // optional
  data: {                         // optional — custom key-value data
    plan: "pro",
    company: "Acme Inc",
  },
});
```

**Only `subscriberId` is required.** All other fields are optional.

## Retrieve a Subscriber

```typescript
const subscriber = await novu.subscribers.retrieve("user-123");
```

## Search Subscribers

```typescript
const results = await novu.subscribers.search({
  email: "jane@example.com",
});
```

## Update a Subscriber

```typescript
await novu.subscribers.patch(
  { firstName: "Jane", data: { plan: "enterprise" } },
  // subscriberId
  "user-123"
);
```

## Delete a Subscriber

```typescript
await novu.subscribers.delete("user-123");
```

## Bulk Create

Create multiple subscribers at once. 500 subscribers can be created in one request.

```typescript
await novu.subscribers.createBulk({
  subscribers: [
    { subscriberId: "user-1", email: "alice@example.com", firstName: "Alice" },
    { subscriberId: "user-2", email: "bob@example.com", firstName: "Bob" },
    { subscriberId: "user-3", email: "carol@example.com", firstName: "Carol" },
  ],
});
```

## Topics

Topics are named groups of subscribers. Use them to send notifications to multiple subscribers at once.

### Create a Topic

```typescript
await novu.topics.create({
  key: "engineering-team",
  name: "Engineering Team",
});
```

### Add Subscribers to a Topic

```typescript
await novu.topics.subscriptions.create(
  { subscriptions: ["subscriberId-1", "subscriberId-2", "subscriberId-3"] },
  "engineering-team-topic"
);
```

### Remove Subscribers from a Topic

```typescript
await novu.topics.subscriptions.delete(
  { subscriptions: ["subscriberId-1", "subscriberId-2"] },
  "engineering-team-topic"
);
```

### List Topics

```typescript
const topics = await novu.topics.list({

});
```

### Delete a Topic

```typescript
await novu.topics.delete("engineering-team-topic");
```

### Trigger to a Topic

See [trigger-notification](../trigger-notification/) for topic trigger examples.

```typescript
await novu.trigger({
  workflowId: "project-update",
  to: { type: "Topic", topicKey: "engineering-team-topic" },
  payload: { message: "Sprint review at 3pm" },
});
```

## Subscriber Credentials

Set channel-specific credentials for push and chat integrations.

### FCM Push Token

```typescript
await novu.subscribers.credentials.update(
  { 
    providerId: "fcm", 
    //  use integrationIdentifier if there are multiple fcm type active integrations
    integrationIdentifier: "fcm-abc-123", 
    credentials: { deviceTokens: ["fcm-device-token-here"] } 
  },
  "subsriberId-1"
);
```

### APNS Push Token

```typescript
await novu.subscribers.credentials.update(
  { 
    providerId: "apns", 
    // use integrationIdentifier if there are multiple apns type active integrations
    integrationIdentifier: "fcm-abc-123", 
    credentials: { deviceTokens: ["apns-device-token-here"] } 
  },
  "user-123"
);
```

## Common Pitfalls

1. **`subscriberId` is YOUR user ID** — it bridges your system to Novu. Use a stable, unique identifier from your database.
2. **Subscribers are auto-created on trigger** — if you pass a full subscriber object in `to` when triggering, Novu creates the subscriber if it doesn't exist. But explicit creation gives you more control.
3. **Subscriber data is per-environment** — dev, staging, and production have separate subscriber records.
4. **Topics must exist before triggering** — create the topic and add subscribers before sending to it.
5. **Deleting a subscriber doesn't delete their notifications** — existing notifications remain in the system.
6. **Adding non existent subscriber to topic** - if non existent subscriber is added to topic, it is not autocreated in that environment and hence not added to the topic. Always create subscribers before adding into the topic

## References

- [Subscriber CRUD Examples](./references/subscriber-crud-examples.md)
- [Topics Examples](./references/topics-examples.md)
- [Credentials Examples](./references/credentials-examples.md)
