# Workflow Preferences Examples

## All Channels Enabled, Subscriber-Editable

```typescript
import { workflow } from "@novu/framework";

const myWorkflow = workflow("general-notification", execute, {
  preferences: {
    all: { enabled: true, readOnly: false },
  },
});
```

## Specific Channels Only

```typescript
const emailOnlyWorkflow = workflow("weekly-report", execute, {
  preferences: {
    all: { enabled: false },
    channels: {
      email: { enabled: true },
    },
  },
});
```

## Critical Notification (Read-Only)

```typescript
const securityAlertWorkflow = workflow("security-alert", execute, {
  preferences: {
    all: { enabled: true, readOnly: true },
  },
});
```

## Mixed Channel Defaults

```typescript
const orderUpdateWorkflow = workflow("order-update", execute, {
  preferences: {
    all: { enabled: true, readOnly: false },
    channels: {
      email: { enabled: true },
      sms: { enabled: false },     // off by default, subscriber can enable
      push: { enabled: true },
      chat: { enabled: false },
      inApp: { enabled: true },
    },
  },
});
```

## In-App + Email Default

```typescript
const commentWorkflow = workflow("new-comment", execute, {
  preferences: {
    all: { enabled: false },
    channels: {
      email: { enabled: true },
      inApp: { enabled: true },
    },
  },
});
```

## All Channels Disabled by Default

Subscribers must opt in:

```typescript
const optInWorkflow = workflow("beta-updates", execute, {
  preferences: {
    all: { enabled: false, readOnly: false },
  },
});
```
