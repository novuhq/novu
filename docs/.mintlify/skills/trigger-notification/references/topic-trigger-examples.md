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

### Node.js

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

### Python

```python
result = novu.trigger(trigger_event_request_dto=novu_py.TriggerEventRequestDto(
    workflow_id="project-update",
    to={"type": "Topic", "topic_key": "project-alpha-watchers"},
    payload={
        "projectName": "Alpha",
        "update": "New release v2.0 deployed",
    },
))
```

### Go

```go
res, err := s.Trigger(context.Background(), components.TriggerEventRequestDto{
    WorkflowID: "project-update",
    To: components.CreateToTopicPayloadDto(components.TopicPayloadDto{
        Type:     components.TriggerRecipientsTypeEnumTopic,
        TopicKey: "project-alpha-watchers",
    }),
    Payload: map[string]any{
        "projectName": "Alpha",
        "update":      "New release v2.0 deployed",
    },
}, nil)
```

### PHP

```php
$response = $sdk->trigger(
    triggerEventRequestDto: new Components\TriggerEventRequestDto(
        workflowId: 'project-update',
        to: new Components\TopicPayloadDto(
            topicKey: 'project-alpha-watchers',
            type: Components\TriggerRecipientsTypeEnum::Topic,
        ),
        payload: [
            'projectName' => 'Alpha',
            'update' => 'New release v2.0 deployed',
        ],
    ),
);
```

### .NET

```csharp
var result = await sdk.TriggerAsync(triggerEventRequestDto: new TriggerEventRequestDto() {
    WorkflowId = "project-update",
    To = To.CreateTopicPayloadDto(new TopicPayloadDto() {
        Type = TriggerRecipientsTypeEnum.Topic,
        TopicKey = "project-alpha-watchers",
    }),
    Payload = new Dictionary<string, object>() {
        { "projectName", "Alpha" },
        { "update", "New release v2.0 deployed" },
    },
});
```

### Java

```java
var res = novu.trigger()
    .body(TriggerEventRequestDto.builder()
        .workflowId("project-update")
        .to(To2.of(TopicPayloadDto.builder()
            .type(TriggerRecipientsTypeEnum.TOPIC)
            .topicKey("project-alpha-watchers")
            .build()))
        .payload(Map.of(
            "projectName", "Alpha",
            "update", "New release v2.0 deployed"))
        .build())
    .call();
```

## Trigger to Multiple Topics

### Node.js

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

### cURL

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
- Official server-side SDKs exist for TypeScript, Python, Go, PHP, .NET, and Java — see https://docs.novu.co/platform/sdks#server-side-sdks
