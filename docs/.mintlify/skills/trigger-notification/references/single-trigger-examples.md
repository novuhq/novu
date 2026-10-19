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

console.log(result);
```

### Python

```python
from novu_py import Novu
from novu_py.models import TriggerEventRequestDto

novu = Novu(security=Security(secret_key=os.environ["NOVU_SECRET_KEY"]))

result = novu.trigger(request=TriggerEventRequestDto(
    workflow_id="welcome-email",
    to="subscriber-123",
    payload={
        "userName": "Jane",
        "companyName": "Acme Inc",
    },
))

print(result)
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
