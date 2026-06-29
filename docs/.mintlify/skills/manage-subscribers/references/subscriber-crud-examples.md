# Subscriber CRUD Examples

## Create

### Node.js

```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY,
});

await novu.subscribers.create({
  subscriberId: "user-123",
  email: "jane@example.com",
  firstName: "Jane",
  lastName: "Doe",
  phone: "+15551234567",
  avatar: "https://example.com/jane.jpg",
  locale: "en-US",
  timezone: "America/New_York",
  data: {
    plan: "pro",
    company: "Acme Inc",
  },
});
```

### Python

```python
from novu_py import Novu

novu = Novu(security=Security(secret_key=os.environ["NOVU_SECRET_KEY"]))

novu.subscribers.create(request={
    "subscriber_id": "user-123",
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name": "Doe",
})
```

### cURL

```bash
curl -X POST https://api.novu.co/v1/subscribers \
  -H "Authorization: ApiKey $NOVU_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriberId": "user-123",
    "email": "jane@example.com",
    "firstName": "Jane",
    "lastName": "Doe"
  }'
```

## Read

### Retrieve Single Subscriber

```typescript
const subscriber = await novu.subscribers.retrieve("user-123");
console.log(subscriber.result);
```

### cURL — Get Subscriber

```bash
curl https://api.novu.co/v1/subscribers/user-123 \
  -H "Authorization: ApiKey $NOVU_SECRET_KEY"
```


### Search Subscribers

```typescript
const results = await novu.subscribers.search({
  email: "jane@example.com",
});
```

## Update

### Partial Update

```typescript
await novu.subscribers.patch(
  { firstName: "Jane", data: { plan: "enterprise" } },
  "user-123"
);
```

### cURL

```bash
curl -X PATCH https://api.novu.co/v1/subscribers/user-123 \
  -H "Authorization: ApiKey $NOVU_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "data": { "plan": "enterprise" }
  }'
```

## Delete

```typescript
await novu.subscribers.delete("user-123");
```

### cURL

```bash
curl -X DELETE https://api.novu.co/v1/subscribers/user-123 \
  -H "Authorization: ApiKey $NOVU_SECRET_KEY"
```

## Bulk Create

At max 500 subscribers can be created in one single api call

```typescript
await novu.subscribers.createBulk({
  subscribers: [
    { subscriberId: "user-1", email: "alice@example.com", firstName: "Alice" },
    { subscriberId: "user-2", email: "bob@example.com", firstName: "Bob" },
    { subscriberId: "user-3", email: "carol@example.com", firstName: "Carol" },
  ],
});
```
