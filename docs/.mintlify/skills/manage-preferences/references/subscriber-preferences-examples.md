# Subscriber Preferences Examples

## List All Preferences

### Node.js

```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY,
});

const preferences = await novu.subscribers.preferences.list({
  subscriberId: "subscriber-123",
});
console.log(preferences.result);
```

### cURL

```bash
curl https://api.novu.co/v1/subscribers/subscriber-123/preferences \
  -H "Authorization: ApiKey $NOVU_SECRET_KEY"
```

## Update Workflow-Specific Preference

### Node.js

```typescript
await novu.subscribers.preferences.update(
  {
    workflowId: "weekly-newsletter",
    channels: { email: false, inApp: true },
  },
  "subscriber-123"
);
```

### cURL

```bash
curl -X PATCH https://api.novu.co/v1/subscribers/subscriber-123/preferences \
  -H "Authorization: ApiKey $NOVU_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "weekly-newsletter",
    "channels": {
      "email": false,
      "inApp": true
    }
  }'
```

## Update Global Preferences

Applies across all workflows — omit `workflowId`:

```typescript
await novu.subscribers.preferences.update(
  { channels: { sms: false, push: false } },
  "subscriber-123"
);
```

## Client-Side Preference Updates

Using `@novu/js`:

```typescript
import { Novu } from "@novu/js";

const novu = new Novu({
  applicationIdentifier: "YOUR_NOVU_APP_ID",
  subscriberId: "subscriber-123",
  // subscriberHash is required if HMAC encryption is turned on. Read more https://docs.novu.co/platform/inbox/prepare-for-production#secure-your-inbox-with-hmac-encryption
  subscriberHash: "hmac-hash",
});

// List preferences
const { data: preferences } = await novu.preferences.list();

// Update a specific workflow
await novu.preferences.update({
  channels: { email: true, push: true },
  workflowId: "workflow-id",
});

// bulk update preferences
await novu.preferences.bulkUpdate([
  { workflowId: 'workflow_id', channels: { email: false, sms: true } },
  { workflowId: 'workflow_id_2', channels: { email: true, sms: false, in_app: true } },
]);
```

## Common Preference Operations

### Disable email at global preference level.

```typescript
await novu.subscribers.preferences.update(
  { channels: { email: false } },
  "subscriber-123"
);
```

### Opt out of email channel for a specific workflow

```typescript
await novu.subscribers.preferences.update(
  { workflowId: "weekly-newsletter", channels: { email: true } },
  "subscriber-123"
);
```
