# Workflow Templates

Nine reference flows. Match a use case to a template and copy its shape on whichever surface you author on (Dashboard or Framework).

Each template includes a metadata table:

| Field         | Meaning                                                            |
| ------------- | ------------------------------------------------------------------ |
| `Severity`    | `LOW` / `MEDIUM` / `HIGH` / unset (`None`)                         |
| `Critical`    | `true` ⇒ bypass preferences, skip digest, immediate delivery       |
| `Actionable`  | `Informational` (no action) or `Requires Action` (CTA)             |
| `Interaction` | `USER TRANSACTION`, `CONVERSATIONAL`, `SYSTEM TRANSACTION`, `LIFECYCLE` |

Channels noted with `(if channel is configured)` are only included when the organization has that integration set up. Steps with a `Step condition` line run only when the condition holds — see [`step-conditions.md`](./step-conditions.md) for the JSON-Logic and Framework `skip` equivalents.

---

## 1. Order Confirmation

| Severity    | None             |
| ----------- | ---------------- |
| Critical    | `false`          |
| Actionable  | Informational    |
| Interaction | USER TRANSACTION |

```
Trigger
  ↓
Digest: type "regular", look-back 5min, digest time 1h
  Key: subscriberId
  ↓
In-App
  ↓
Email
  ↓
Push (if channel is configured)
  Step condition: Send only if subscriber is offline
```

---

## 2. Comment on Your Post

| Severity    | None           |
| ----------- | -------------- |
| Critical    | `false`        |
| Actionable  | Informational  |
| Interaction | CONVERSATIONAL |

```
Trigger (event: payload.threadId: "post_123")
  ↓
Digest: type "regular", look-back 5min, digest time 1h
  Key: subscriberId + threadId
  ↓
In-App
  Redirect: → thread
  ↓
Push (if channel is configured)
  Step condition: Send only if subscriber is offline
  ↓
Delay (4 hours)
  Step condition: Only if In-App not seen
  ↓
Email
  Content: summary of the comments
  Step condition: Only if In-App not seen
```

---

## 3. Payment Failed

| Severity    | HIGH             |
| ----------- | ---------------- |
| Critical    | `false`          |
| Actionable  | Requires Action  |
| Interaction | USER TRANSACTION |

```
Trigger
  ↓
In-App
  ↓
Chat (if channel is configured)
  ↓
Email
  ↓
Push (if channel is configured)
  Step condition: Send only if subscriber is offline
```

---

## 4. Account Suspended

| Severity    | HIGH               |
| ----------- | ------------------ |
| Critical    | `true`             |
| Actionable  | Requires Action    |
| Interaction | SYSTEM TRANSACTION |

Critical workflow:

- Bypasses subscriber preferences
- No delays, immediate delivery
- All available channels in parallel

```
Trigger (event: payload.account.suspended, payload.reason: "kyc_required")
  ↓
In-App
  ↓
Email
  ↓
SMS (if channel is configured)
  ↓
Chat (if channel is configured)
  ↓
Push (if channel is configured)
  Step condition: Send only if subscriber is offline
```

---

## 5. Forgot Password

| Severity    | None               |
| ----------- | ------------------ |
| Critical    | `true`             |
| Actionable  | Requires Action    |
| Interaction | SYSTEM TRANSACTION |

No In-App step — the user isn't signed in when this fires.

```
Trigger
  ↓
Email
  ↓
SMS (if channel is configured)
```

---

## 6. Trial Expiring Tomorrow

| Severity    | HIGH            |
| ----------- | --------------- |
| Critical    | `false`         |
| Actionable  | Requires Action |
| Interaction | LIFECYCLE       |

```
Trigger
  ↓
In-App
  ↓
Chat (if channel is configured)
  ↓
Email
  ↓
Push (if channel is configured)
  Step condition: Send only if subscriber is offline
```

---

## 7. Explicit Channel Request (User-Specified)

> User said: "Create a push notification when order ships"

```
Trigger
  ↓
Push
```

Rule: when the user names channels, use **only** those channels. No fallbacks. No extras. Add the channel even if it's not configured in the organization (the user explicitly asked for it).

---

## 8. Webhook / External API Call

> User said: "Notify users and call our webhook when a payment fails"

| Severity    | HIGH             |
| ----------- | ---------------- |
| Critical    | `false`          |
| Actionable  | Requires Action  |
| Interaction | USER TRANSACTION |

```
Trigger
  ↓
In-App
  ↓
Email
  ↓
HTTP Request
  method: POST
  url: "{{payload.webhookUrl}}"
  headers: [{ key: "Content-Type", value: "application/json" }]
  body: [
    { key: "event", value: "payment_failed" },
    { key: "subscriberId", value: "{{subscriber.subscriberId}}" }
  ]
  continueOnFailure: true
```

Use `HTTP Request` whenever a workflow must call an external API or webhook in addition to (or instead of) sending notifications.

---

## 9. Fetch Data Then Notify (HTTP Step → Channel Step)

> User said: "Fetch the user's plan from our API and send them a personalized email"

```
Trigger
  ↓
HTTP Request (stepId: "fetch-plan")
  method: GET
  url: "https://api.example.com/users/{{payload.userId}}/plan"
  responseBodySchema: {
    type: "object",
    properties: {
      planName: { type: "string" },
      renewalDate: { type: "string" }
    },
    required: ["planName", "renewalDate"]
  }
  ↓
Email
  subject: "Your {{ steps.fetch-plan.planName }} plan"
  body: "Your plan renews on {{ steps.fetch-plan.renewalDate }}."
```

Rule: when a subsequent step references HTTP response data, the HTTP step **must** declare a `responseBodySchema`. Only properties declared in the schema are addressable as `{{ steps.<http-step-id>.<property> }}`.

---

## See Also

- [`channel-selection.md`](./channel-selection.md) — why each template chose those channels
- [`severity-and-critical.md`](./severity-and-critical.md) — when to set severity vs critical
- [`digest-defaults.md`](./digest-defaults.md) — the digest config used in templates 1 & 2
- [`step-conditions.md`](./step-conditions.md) — JSON-Logic / `skip` snippets for "send only if offline" and "only if In-App not seen"
- [`framework-integration/references/workflow-and-steps.md`](../../framework-integration/references/workflow-and-steps.md) — Framework primitives to implement these flows in code
