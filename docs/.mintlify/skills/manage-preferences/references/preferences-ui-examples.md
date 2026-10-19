# Preferences UI Examples

## Built-In Preferences (Inside Inbox)

The Inbox component includes a built-in Preferences panel. Subscribers access it via the settings icon:

```tsx
import { Inbox } from "@novu/react";

function App() {
  return (
    <Inbox
      applicationIdentifier={process.env.REACT_APP_NOVU_APP_ID!}
      subscriberId="subscriber-123"
      subscriberHash="hmac-hash"
    />
  );
}
```

## Standalone Preferences Component

Render the Preferences panel independently:

```tsx
import { Inbox, Preferences } from "@novu/react";

function PreferencesPage() {
  return (
    <Inbox
      applicationIdentifier={process.env.REACT_APP_NOVU_APP_ID!}
      subscriberId="subscriber-123"
      subscriberHash="hmac-hash"
    >
      <Preferences />
    </Inbox>
  );
}
```

## Preferences with Filtering

Filter which workflows appear in the Preferences panel:

```tsx
<Inbox
  applicationIdentifier={process.env.REACT_APP_NOVU_APP_ID!}
  subscriberId="subscriber-123"
  preferencesFilter={{
    tags: ["marketing"],  // only show workflows tagged "marketing"
  }}
/>
```

## Preference Groups

Group workflows in the Preferences panel:

```tsx
<Inbox
  applicationIdentifier={process.env.REACT_APP_NOVU_APP_ID!}
  subscriberId="subscriber-123"
  preferenceGroups={[
    {
      name: "Account",
      filter: { tags: ["account"] },
    },
    {
      name: "Marketing",
      filter: { tags: ["marketing"] },
    },
    {
      name: "Activity",
      filter: { tags: ["activity"] },
    },
  ]}
/>
```

## Custom Preferences UI with @novu/js

Build a completely custom preferences interface:

```typescript
import { Novu } from "@novu/js";

const novu = new Novu({
  applicationIdentifier: "YOUR_NOVU_APP_ID",
  subscriberId: "subscriber-123",
  subscriberHash: "hmac-hash",
});

// Fetch all preferences
const { data: preferences } = await novu.preferences.list();

// Render custom UI
preferences.forEach((pref) => {
  console.log(`Workflow: ${pref.workflow.name}`);
  console.log(`  Email: ${pref.channels.email}`);
  console.log(`  SMS: ${pref.channels.sms}`);
  console.log(`  Push: ${pref.channels.push}`);
  console.log(`  In-App: ${pref.channels.inApp}`);
  console.log(`  Chat: ${pref.channels.chat}`);
});

// Toggle a preference

preferences?.[1]?.update({
  channels: { email: true, push: true },
});

```

## Next.js Example

```tsx
// components/PreferencesPanel.tsx
"use client";

import { Inbox, Preferences } from "@novu/nextjs";

export function PreferencesPanel({
  subscriberId,
  subscriberHash,
}: {
  subscriberId: string;
  subscriberHash: string;
}) {
  return (
    <Inbox
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_ID!}
      subscriberId={subscriberId}
      subscriberHash={subscriberHash}
    >
      <Preferences />
    </Inbox>
  );
}
```

## Important Notes

- Read-only workflows (`readOnly: true`) are **hidden** from the Preferences UI — subscribers cannot change them. It signifies that workflow is critical
- The Preferences component requires a parent `<Inbox>` wrapper for the Novu context
- Preferences are per-subscriber and per-environment (dev, staging, prod) and scoped per context
- Changes made via the UI are immediately reflected in notification delivery
