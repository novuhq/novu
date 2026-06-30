# Topics Examples

Topics are named groups of subscribers used for broadcast-style notifications.

## Create a Topic

```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY,
});

await novu.topics.create({
  key: "engineering-team",
  name: "Engineering Team",
});
```

### cURL

```bash
curl -X POST https://api.novu.co/v1/topics \
  -H "Authorization: ApiKey $NOVU_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "engineering-team",
    "name": "Engineering Team"
  }'
```

## Add Subscribers to a Topic

```typescript
await novu.topics.subscriptions.create(
  { subscriptions: ["user-1", "user-2", "user-3"] },
  "engineering-team"
);
```

### cURL

```bash
curl -X POST https://api.novu.co/v1/topics/engineering-team/subscriptions \
  -H "Authorization: ApiKey $NOVU_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptions": ["user-1", "user-2", "user-3"]
  }'
```

## Remove Subscribers from a Topic

```typescript
await novu.topics.subscriptions.delete(
  { subscriptions: ["user-3"] },
  "engineering-team"
);
```

## List All Topics

```typescript
const topics = await novu.topics.list({});
console.log(topics.result);
```

### cURL

```bash
curl https://api.novu.co/v1/topics \
  -H "Authorization: ApiKey $NOVU_SECRET_KEY"
```

## Retrieve a Specific Topic

```typescript
const topic = await novu.topics.get("engineering-team");
console.log(topic.result);
```

## Rename a Topic

```typescript
await novu.topics.update(
  { name: "Engineering & Platform Team" },
  "engineering-team"
);
```

## Delete a Topic

```typescript
await novu.topics.delete("engineering-team");
```

## Trigger to a Topic

```typescript
await novu.trigger({
  workflowId: "sprint-update",
  to: { type: "Topic", topicKey: "engineering-team" },
  payload: { message: "Sprint 42 retrospective notes are ready" },
});
```

## Common Topic Patterns

### Per-Project Topics

```typescript
// Create a topic per project
await novu.topics.create({ key: `project-${projectId}`, name: projectName });

// Add team members
await novu.topics.subscriptions.create(
  { subscriptions: teamMemberIds },
  `project-${projectId}`
);

// Notify the project team
await novu.trigger({
  workflowId: "project-update",
  to: { type: "Topic", topicKey: `project-${projectId}` },
  payload: { update: "New deployment" },
});
```

### Role-Based Topics

```typescript
const roles = ["admin", "editor", "viewer"];

for (const role of roles) {
  await novu.topics.create({ key: `role-${role}`, name: `${role} Users` });
}

// Add users by role
await novu.topics.subscriptions.create(
  { subscriptions: adminUserIds },
  "role-admin"
);
```
