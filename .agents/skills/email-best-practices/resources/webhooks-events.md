# Webhooks and Events

Receiving and processing email delivery events in real-time.

## Event Types

| Event | When Fired | Use For |
|-------|------------|---------|
| `email.sent` | Email accepted by Resend | Confirming send initiated |
| `email.delivered` | Email delivered to recipient server | Confirming delivery |
| `email.bounced` | Email bounced (hard or soft) | List hygiene, alerting |
| `email.complained` | Recipient marked as spam | Immediate unsubscribe |
| `email.opened` | Recipient opened email | Engagement tracking |
| `email.clicked` | Recipient clicked link | Engagement tracking |

## Webhook Setup

### 1. Create Endpoint

Your endpoint must:
- Accept POST requests
- Return 2xx status quickly (within 5 seconds)
- Handle duplicate events (idempotent processing)

```typescript
app.post('/webhooks/resend', async (req, res) => {
  // Return 200 immediately to acknowledge receipt
  res.status(200).send('OK');

  // Process asynchronously
  processWebhookAsync(req.body).catch(console.error);
});
```

### 2. Verify Signatures

Always verify webhook signatures to prevent spoofing.

```typescript
import { Webhook } from 'svix';

const webhook = new Webhook(process.env.RESEND_WEBHOOK_SECRET);

app.post('/webhooks/resend', (req, res) => {
  try {
    const payload = webhook.verify(
      JSON.stringify(req.body),
      {
        'svix-id': req.headers['svix-id'],
        'svix-timestamp': req.headers['svix-timestamp'],
        'svix-signature': req.headers['svix-signature'],
      }
    );
    // Process verified payload
  } catch (err) {
    return res.status(400).send('Invalid signature');
  }
});
```

### 3. Register Webhook URL

Configure your webhook endpoint in the Resend dashboard or via API.

## Processing Events

### Bounce Handling

```typescript
async function handleBounce(event) {
  const { email_id, email, bounce_type } = event.data;

  if (bounce_type === 'hard') {
    // Permanent failure - remove from all lists
    await suppressEmail(email, 'hard_bounce');
    await removeFromAllLists(email);
  } else {
    // Soft bounce - track and remove after threshold
    await incrementSoftBounce(email);
    const count = await getSoftBounceCount(email);
    if (count >= 3) {
      await suppressEmail(email, 'soft_bounce_limit');
    }
  }
}
```

### Complaint Handling

```typescript
async function handleComplaint(event) {
  const { email } = event.data;

  // Immediate suppression - no exceptions
  await suppressEmail(email, 'complaint');
  await removeFromAllLists(email);
  await logComplaint(event); // For analysis
}
```

### Delivery Confirmation

```typescript
async function handleDelivered(event) {
  const { email_id } = event.data;
  await updateEmailStatus(email_id, 'delivered');
}
```

## Idempotent Processing

Webhooks may be sent multiple times. Use event IDs to prevent duplicate processing.

```typescript
async function processWebhook(event) {
  const eventId = event.id;

  // Check if already processed
  if (await isEventProcessed(eventId)) {
    return; // Skip duplicate
  }

  // Process event
  await handleEvent(event);

  // Mark as processed
  await markEventProcessed(eventId);
}
```

## Error Handling

### Retry Behavior

If your endpoint returns non-2xx, webhooks will retry with exponential backoff:
- Retry 1: ~30 seconds
- Retry 2: ~1 minute
- Retry 3: ~5 minutes
- (continues for ~24 hours)

### Best Practices

- **Return 200 quickly** - Process asynchronously to avoid timeouts
- **Be idempotent** - Handle duplicate deliveries gracefully
- **Log everything** - Store raw events for debugging
- **Alert on failures** - Monitor webhook processing errors
- **Queue for processing** - Use a job queue for complex handling

## Testing Webhooks

**Local development:** Use ngrok or similar to expose localhost.

```bash
ngrok http 3000
# Use the ngrok URL as your webhook endpoint
```

**Verify handling:** Send test events through Resend dashboard or manually trigger each event type.

## Ingest webhooks for data storage
- [Open source repo](https://github.com/resend/resend-webhooks-ingester)
- [Why store data](https://resend.com/docs/dashboard/webhooks/how-to-store-webhooks-data)

## Related

- [List Management](./list-management.md) - What to do with bounce/complaint data
- [Sending Reliability](./sending-reliability.md) - Retry logic when sends fail
