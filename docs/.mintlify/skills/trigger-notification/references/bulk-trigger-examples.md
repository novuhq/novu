# Bulk Trigger Examples

## Basic Bulk Trigger

Send up to 100 events in a single request:

```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY,
});

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
    {
      workflowId: "order-shipped",
      to: "subscriber-3",
      payload: { orderId: "ORD-100" },
    },
  ],
});
```

## Chunking for Large Batches

For more than 100 events, chunk into groups:

```typescript
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

const allEvents = users.map((user) => ({
  workflowId: "weekly-digest",
  to: user.id,
  payload: { userName: user.name },
}));

const batches = chunk(allEvents, 100);

for (const batch of batches) {
  await novu.triggerBulk({ events: batch });
}
```

## cURL

```bash
curl -X POST https://api.novu.co/v1/events/trigger/bulk \
  -H "Authorization: ApiKey $NOVU_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "events": [
      {
        "name": "welcome-email",
        "to": "subscriber-1",
        "payload": { "userName": "Alice" }
      },
      {
        "name": "welcome-email",
        "to": "subscriber-2",
        "payload": { "userName": "Bob" }
      }
    ]
  }'
```

## Important Notes

- Maximum **100 events** per bulk request
- Each event in the bulk request is independent — different workflows, subscribers, and payloads are allowed
- Errors/Success responses are returned per-event, not for the entire batch
- For very large sends (thousands+), consider using topic-based triggers instead
