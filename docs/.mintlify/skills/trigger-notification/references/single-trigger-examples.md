# Single Trigger Examples

## Basic Trigger

### Node.js

```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY,
});

const result = await novu.trigger({
  workflowId: "welcome-email",
  to: "subscriber-123",
  payload: {
    userName: "Jane",
    companyName: "Acme Inc",
  },
});
```

### Python

```python
import os
import novu_py
from novu_py import Novu

with Novu(secret_key=os.environ["NOVU_SECRET_KEY"]) as novu:
    result = novu.trigger(trigger_event_request_dto=novu_py.TriggerEventRequestDto(
        workflow_id="welcome-email",
        to="subscriber-123",
        payload={
            "userName": "Jane",
            "companyName": "Acme Inc",
        },
    ))
```

### Go

```go
import (
    "context"
    "os"

    novugo "github.com/novuhq/novu-go"
    "github.com/novuhq/novu-go/models/components"
)

s := novugo.New(novugo.WithSecurity(os.Getenv("NOVU_SECRET_KEY")))

res, err := s.Trigger(context.Background(), components.TriggerEventRequestDto{
    WorkflowID: "welcome-email",
    To:         components.CreateToStr("subscriber-123"),
    Payload: map[string]any{
        "userName":    "Jane",
        "companyName": "Acme Inc",
    },
}, nil)
```

### PHP

```php
use novu;
use novu\Models\Components;

$sdk = novu\Novu::builder()
    ->setSecurity(getenv('NOVU_SECRET_KEY'))
    ->build();

$response = $sdk->trigger(
    triggerEventRequestDto: new Components\TriggerEventRequestDto(
        workflowId: 'welcome-email',
        to: 'subscriber-123',
        payload: [
            'userName' => 'Jane',
            'companyName' => 'Acme Inc',
        ],
    ),
);
```

### .NET

```csharp
using Novu;
using Novu.Models.Components;
using System.Collections.Generic;

var sdk = new NovuSDK(secretKey: Environment.GetEnvironmentVariable("NOVU_SECRET_KEY"));

var result = await sdk.TriggerAsync(triggerEventRequestDto: new TriggerEventRequestDto() {
    WorkflowId = "welcome-email",
    To = To.CreateStr("subscriber-123"),
    Payload = new Dictionary<string, object>() {
        { "userName", "Jane" },
        { "companyName", "Acme Inc" },
    },
});
```

### Java

```java
import co.novu.Novu;
import co.novu.models.components.*;
import java.util.Map;

Novu novu = Novu.builder()
    .secretKey(System.getenv("NOVU_SECRET_KEY"))
    .build();

var res = novu.trigger()
    .body(TriggerEventRequestDto.builder()
        .workflowId("welcome-email")
        .to(To2.of("subscriber-123"))
        .payload(Map.of(
            "userName", "Jane",
            "companyName", "Acme Inc"))
        .build())
    .call();
```

### cURL

```bash
curl -X POST https://api.novu.co/v1/events/trigger \
  -H "Authorization: ApiKey $NOVU_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "welcome-email",
    "to": "subscriber-123",
    "payload": {
      "userName": "Jane",
      "companyName": "Acme Inc"
    }
  }'
```

## Trigger with Inline Subscriber

Auto-create or update the subscriber during trigger:

```typescript
const result = await novu.trigger({
  workflowId: "welcome-email",
  to: {
    subscriberId: "user-456",
    email: "jane@example.com",
    firstName: "Jane",
    lastName: "Doe",
    phone: "+15551234567",
    avatar: "https://example.com/avatars/jane.jpg",
    locale: "en-US",
    data: {
      plan: "pro",
      signupSource: "landing-page",
    },
  },
  payload: { userName: "Jane" },
});
```

## Trigger with Actor

Include the actor (who triggered the action) for use in templates:

```typescript
const result = await novu.trigger({
  workflowId: "comment-notification",
  to: "post-author-123",
  payload: {
    commentText: "Great post!",
    postTitle: "Getting Started with Novu",
  },
  actor: "commenter-456",
});
```

## Trigger with Transaction ID

For idempotency and cancellation support:

```typescript
import { randomUUID } from "crypto";

const transactionId = randomUUID();

const result = await novu.trigger({
  workflowId: "order-confirmation",
  to: "customer-789",
  payload: { orderId: "order-001", total: "$99.99" },
  transactionId,
});

// Later, cancel if needed (only works for delayed/digested notifications)
await novu.cancel(transactionId);
```

## Trigger with Overrides

Override provider-specific settings:

```typescript
const result = await novu.trigger({
  workflowId: "alert-notification",
  to: "admin-001",
  payload: { message: "CPU usage above 90%" },
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

## Trigger with Context (Multi-Tenancy)

Pass organizational context for multi-tenant applications:

```typescript
const result = await novu.trigger({
  workflowId: "invoice-created",
  to: "user-123",
  payload: { invoiceId: "INV-001" },
  context: {
    organizationId: "org-acme",
  },
});
```
