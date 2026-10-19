# List Management

Maintaining clean email lists through suppression, hygiene, and data retention.

## Suppression Lists

A suppression list prevents sending to addresses that should never receive email.

### What to Suppress

| Reason | Action | Can Unsuppress? |
|--------|--------|-----------------|
| Hard bounce | Add immediately | No (address invalid) |
| Complaint (spam) | Add immediately | No (legal requirement) |
| Soft bounce (3x) | Add after threshold | Yes, after 30-90 days |
| Manual removal | Add on request | Only if user requests |

### Implementation

```typescript
// Suppression list schema
interface SuppressionEntry {
  email: string;
  reason: 'hard_bounce' | 'complaint' | 'unsubscribe' | 'soft_bounce' | 'manual';
  created_at: Date;
  source_email_id?: string; // Which email triggered this
}

// Check before every send
async function canSendTo(email: string): Promise<boolean> {
  const suppressed = await db.suppressions.findOne({ email });
  return !suppressed;
}

// Add to suppression list
async function suppressEmail(email: string, reason: string, sourceId?: string) {
  await db.suppressions.upsert({
    email: email.toLowerCase(),
    reason,
    created_at: new Date(),
    source_email_id: sourceId,
  });
}
```

### Pre-Send Check

**Always check suppression before sending:**

```typescript
async function sendEmail(to: string, emailData: EmailData) {
  if (!await canSendTo(to)) {
    console.log(`Skipping suppressed email: ${to}`);
    return { skipped: true, reason: 'suppressed' };
  }

  return await resend.emails.send({ to, ...emailData });
}
```

## List Hygiene

Regular maintenance to keep lists healthy.

### Automated Cleanup

| Task | Frequency | Action |
|------|-----------|--------|
| Remove hard bounces | Real-time (via webhook) | Immediate suppression |
| Remove complaints | Real-time (via webhook) | Immediate suppression |
| Process unsubscribes | Real-time | Remove from marketing lists |
| Review soft bounces | Daily | Suppress after 3 failures |
| Remove inactive | Monthly | Re-engagement → remove |

Learn more: https://resend.com/docs/knowledge-base/audience-hygiene

### Re-engagement Campaigns

Before removing inactive subscribers:

1. **Identify inactive:** No opens/clicks in 45-90 days
2. **Send re-engagement:** "We miss you" or "Still interested?"
3. **Wait 14-30 days** for response
4. **Remove non-responders** from active lists

```typescript
async function runReengagement() {
  const inactive = await getInactiveSubscribers(90); // 90 days

  for (const subscriber of inactive) {
    if (!subscriber.reengagement_sent) {
      await sendReengagementEmail(subscriber);
      await markReengagementSent(subscriber.email);
    } else if (daysSince(subscriber.reengagement_sent) > 30) {
      await removeFromMarketingLists(subscriber.email);
    }
  }
}
```

## Data Retention

### Email Logs

| Data Type | Recommended Retention | Notes |
|-----------|----------------------|-------|
| Send attempts | 90 days | Debugging, analytics |
| Delivery status | 90 days | Compliance, reporting |
| Bounce/complaint events | 3 years | Required for CASL |
| Suppression list | Indefinite | Never delete |
| Email content | 30 days | Storage costs |
| Consent records | 3 years after expiry | Legal requirement |

### Retention Policy Implementation

```typescript
// Daily cleanup job
async function cleanupOldData() {
  const now = new Date();

  // Delete old email logs (keep 90 days)
  await db.emailLogs.deleteMany({
    created_at: { $lt: subDays(now, 90) }
  });

  // Delete old email content (keep 30 days)
  await db.emailContent.deleteMany({
    created_at: { $lt: subDays(now, 30) }
  });

  // Never delete: suppressions, consent records
}
```

## Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Bounce rate | <2% | >2% |
| Complaint rate | <0.05% | >0.05% |
| Suppression list growth | Stable | Sudden spike |

## Transactional vs Marketing Lists

**Keep separate:**
- Transactional: Can send to anyone with account relationship
- Marketing: Only opted-in subscribers

**Suppression applies to both:** Hard bounces and complaints suppress across all email types.

**Unsubscribe is marketing-only:** User unsubscribing from marketing can still receive transactional emails (password resets, order confirmations).

## Related

- [Webhooks & Events](./webhooks-events.md) - Receive bounce/complaint notifications
- [Deliverability](./deliverability.md) - How list hygiene affects sender reputation
- [Compliance](./compliance.md) - Legal requirements for data retention
