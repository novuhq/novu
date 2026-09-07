---
name: novu-manage-preferences
description: Configure notification preferences in Novu at the workflow and subscriber level. Set default channel preferences (email, SMS, push, chat, in-app), mark preferences as read-only or subscriber-editable, and manage subscriber-specific overrides. Use when setting up notification opt-in/opt-out, configuring per-channel delivery preferences, or building a preferences management UI.
inputs:
  - name: NOVU_SECRET_KEY
    description: "Server-side API key from https://dashboard.novu.co/api-keys. Used by @novu/api."
    required: true
    type: secret
---

# Manage Preferences

Novu has a two-level preference system:
1. **Workflow defaults** — configured in the dashboard for UI based workflows or via code in framework based workflows, apply to all subscribers.
2. **Subscriber overrides** — set by end users, override workflow defaults

## Workflow-Level Preferences

Set default preferences when defining a workflow with `@novu/framework`:

```typescript
import { workflow } from "@novu/framework";

const alertWorkflow = workflow("system-alert", execute, {
  preferences: {
    all: { enabled: true, readOnly: false },
    channels: {
      email: { enabled: true },
      sms: { enabled: false },
      push: { enabled: true },
      chat: { enabled: false },
      inApp: { enabled: true },
    },
  },
});
```

> Authoring workflows in code? See [`framework-integration`](../framework-integration) for the full Framework setup, Bridge Endpoint, step controls, and deployment.

### Channel Types

| Channel | Description |
| --- | --- |
| `email` | Email notifications |
| `sms` | SMS text messages |
| `push` | Mobile/web push notifications |
| `chat` | Slack, Discord, Teams, etc. |
| `inApp` | In-app Inbox notifications |

### Read-Only Preferences

Set `readOnly: true` to **hide a workflow's channels from the Preferences UI** — subscribers can't toggle them on or off:

```typescript
const criticalAlertWorkflow = workflow("critical-alert", execute, {
  preferences: {
    all: { enabled: true, readOnly: true },  // subscriber CANNOT disable
  },
});
```

### `readOnly` vs `critical` — pick the right one

These are different mechanisms with different guarantees. See [`design-workflow/references/severity-and-critical.md`](../design-workflow/references/severity-and-critical.md) for the full matrix.

| Flag                                 | What it does                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| `preferences.all.readOnly: true`     | **UI only.** Hides the workflow from the Preferences UI so subscribers can't toggle it.     |
| `critical: true` (workflow-level)    | **Runtime.** Bypasses subscriber preferences, skips digest, runs without delays.            |

If you need the notification to **always be delivered** (account suspended, security alert, password reset), set `critical: true` — `readOnly: true` alone won't override existing subscriber overrides at runtime.

### Optional (Subscriber-Editable) Preferences

```typescript
const marketingWorkflow = workflow("weekly-newsletter", execute, {
  preferences: {
    all: { enabled: true, readOnly: false },  // subscriber CAN disable
    channels: {
      email: { enabled: true },
      sms: { enabled: false },  // off by default, subscriber can enable
    },
  },
});
```

## Subscriber-Level Preferences

Subscribers can override workflow defaults (unless `readOnly: true`).

### Get Subscriber Preferences

```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  secretKey: process.env.NOVU_SECRET_KEY,
});

const preferences = await novu.subscribers.preferences.list({
  subscriberId: "subscriber-123",
});
```

### Update Subscriber Preferences

```typescript
await novu.subscribers.preferences.update(
  {
    workflowId: "weekly-newsletter",
    channels: {
      email: false,   // opt out of email
      inApp: true,    // keep in-app
    },
  },
  "subscriber-123"
);
```

### Global Preferences

Update preferences across all workflows by omitting `workflowId`:

```typescript
await novu.subscribers.preferences.update(
  {
    channels: {
      sms: false,  // disable SMS for all workflows
    },
  },
  "subscriber-123"
);
```

## Preference Resolution Order

When Novu determines whether to deliver a notification:

1. **Subscriber workflow preference** (most specific) — subscriber's override for this specific workflow
2. **Subscriber global preference** — subscriber's default across all workflows
3. **Workflow default** — developer-defined default in code
4. **System default** — all channels enabled

The most specific preference wins. If a subscriber disables email for a specific workflow, that takes precedence even if their global email preference is enabled.

## Preferences UI Component

### React

```tsx
import { Inbox } from "@novu/react";

function App() {
  return (
    <Inbox
      applicationIdentifier="YOUR_NOVU_APP_ID"
      subscriberId="subscriber-123"
      subscriberHash="HMAC_HASH"
    >
      {/* The Preferences panel is built into the Inbox */}
    </Inbox>
  );
}
```

The `<Inbox />` component includes a built-in Preferences panel accessible via the settings icon.

### Standalone Preferences

Use the `<Preferences />` component independently:

```tsx
import { Inbox, Preferences } from "@novu/react";

function PreferencesPage() {
  return (
    <Inbox
      applicationIdentifier="YOUR_NOVU_APP_ID"
      subscriberId="subscriber-123"
    >
      <Preferences />
    </Inbox>
  );
}
```

## Common Patterns

### Critical Alerts (Always On)

```typescript
preferences: {
  all: { enabled: true, readOnly: true },
}
```

Subscribers cannot opt out. Use for security alerts, payment notifications, legal notices.

### Marketing (Opt-Out Friendly)

```typescript
preferences: {
  all: { enabled: true, readOnly: false },
  channels: {
    email: { enabled: true },
    sms: { enabled: false },
  },
}
```

Subscribers can toggle channels. SMS is off by default.

### In-App Only by Default

```typescript
preferences: {
  all: { enabled: false },
  channels: {
    inApp: { enabled: true },
  },
}
```

Only in-app is on. Subscribers can enable other channels if desired.


## Common Pitfalls

1. **`readOnly: true` is per-workflow, not per-channel** — you set `readOnly` on the `all` level. Individual channels inherit it.
2. **Subscriber overrides don't apply to `readOnly` workflows** — if the workflow is read-only, subscriber preferences are ignored.
3. **`enabled: false` in the workflow default means the channel is off** — subscribers can still enable it (unless `readOnly: true`).
4. **The Preferences UI only shows non-readOnly workflows** — read-only workflows are hidden from the subscriber's preference panel.
5. **Global preferences apply across all non-readOnly workflows** — they're a convenient "disable all email" setting, but workflow-specific preferences take precedence.

## References

- [Workflow Preferences Examples](./references/workflow-preferences-examples.md)
- [Subscriber Preferences Examples](./references/subscriber-preferences-examples.md)
- [Preferences UI Examples](./references/preferences-ui-examples.md)
