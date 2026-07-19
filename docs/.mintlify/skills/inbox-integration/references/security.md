# Inbox Security

## HMAC Subscriber Hash

The subscriber hash prevents unauthorized access to notifications. Without it, anyone who knows a subscriber ID can read their notifications.

**HMAC is mandatory in production.** The Novu API rejects unauthenticated Inbox requests in production environments.

## How It Works

1. Your **server** generates an HMAC-SHA256 hash of the subscriber ID using the `NOVU_SECRET_KEY`
2. The hash is passed to the Inbox component as `subscriberHash`
3. Novu verifies the hash server-side before returning notifications

## Generate the Hash

### Node.js

```typescript
import { createHmac } from "crypto";

function getSubscriberHash(subscriberId: string): string {
  return createHmac("sha256", process.env.NOVU_SECRET_KEY!)
    .update(subscriberId)
    .digest("hex");
}

const hash = getSubscriberHash("user-123");
// => "a1b2c3d4e5f6..."
```

### Python

```python
import hmac
import hashlib
import os

def get_subscriber_hash(subscriber_id: str) -> str:
    return hmac.new(
        os.environ["NOVU_SECRET_KEY"].encode(),
        subscriber_id.encode(),
        hashlib.sha256
    ).hexdigest()

hash = get_subscriber_hash("user-123")
```

### Go

```go
import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "os"
)

func getSubscriberHash(subscriberID string) string {
    mac := hmac.New(sha256.New, []byte(os.Getenv("NOVU_SECRET_KEY")))
    mac.Write([]byte(subscriberID))
    return hex.EncodeToString(mac.Sum(nil))
}
```

## Pass to the Component

### React

```tsx
<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId={userId}
  subscriberHash={subscriberHash}
/>
```

### Vanilla JS

```typescript
const novu = new Novu({
  applicationIdentifier: "YOUR_NOVU_APP_ID",
  subscriberId: userId,
  subscriberHash: subscriberHash,
});
```

## Security Checklist

- **Never expose `NOVU_SECRET_KEY` on the client** — the hash must be generated server-side
- **`applicationIdentifier` is public** — it can safely be in client-side code and environment variables
- **Generate the hash per subscriber** — each subscriber gets a unique hash based on their ID
- **The hash is deterministic** — same subscriber ID + same secret key always produces the same hash
- **Rotate the secret key carefully** — changing the key invalidates all existing hashes
- **Use HTTPS in production** — prevent the hash from being intercepted in transit
