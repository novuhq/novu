# Topic Trigger Examples

Topics let you send notifications to groups of subscribers. Create a topic, add subscribers, then trigger to the topic.

## Create a Topic and Add Subscribers

```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY,
});

// Create a topic
await novu.topics.create({
  key: "project-alpha-watchers",
  name: "Project Alpha Watchers",
});

// Add subscribers to the topic
await novu.topics.subscriptions.create(
  { subscriptions: ["user-1", "user-2", "user-3"] },
  "project-alpha-watchers"
);
```

## Trigger to a Topic

All subscribers in the topic receive the notification:

```typescript
const result = await novu.trigger({
  workflowId: "project-update",
  to: {
    type: "Topic",
    topicKey: "project-alpha-watchers",
  },
  payload: {
    projectName: "Alpha",
    update: "New release v2.0 deployed",
  },
});
```

## Trigger to Multiple Topics

```typescript
const result = await novu.trigger({
  workflowId: "company-announcement",
  to: [
    { type: "Topic", topicKey: "engineering-team" },
    { type: "Topic", topicKey: "product-team" },
  ],
  payload: {
    announcement: "Company all-hands at 3pm",
  },
});
```

## cURL

```bash
curl -X POST https://api.novu.co/v1/events/trigger \
  -H "Authorization: ApiKey $NOVU_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "project-update",
    "to": {
      "type": "Topic",
      "topicKey": "project-alpha-watchers"
    },
    "payload": {
      "projectName": "Alpha",
      "update": "New release v2.0 deployed"
    }
  }'
```

## Important Notes

- Topics must be created before triggering to them
- One subscriber can belong to multiple topics
- Topic triggers fan out to all subscribed members individually
- Duplicate subscribers across multiple topics in the same trigger are automatically deduplicated
