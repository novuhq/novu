---
name: novu-inbox-integration
description: Integrate Novu's in-app notification inbox into web applications. Supports React, Next.js, and vanilla JavaScript. Includes the Inbox component (bell icon + notification feed), composable components (Bell, Notifications, InboxContent, Preferences), headless hooks, branded theming, custom render props, multi-tenancy via contexts, tabs, localization, and HMAC security. Use when adding an in-app notification center, bell icon, notification feed, real-time notification updates, or building a personalized and branded notification experience.
inputs:
  - name: NOVU_APPLICATION_IDENTIFIER
    description: "Application identifier for client-side Inbox integration. Found in dashboard integration settings."
    required: true
    type: string
---

# Inbox Integration

Add an in-app notification center to your web application. The Inbox component provides a bell icon, notification feed, read/archive management, action buttons, and real-time WebSocket updates — all theme-able and personalizable to match your product.

## Packages

| Package | Use For |
| --- | --- |
| `@novu/react` | React 18/19 applications |
| `@novu/nextjs` | Next.js (App Router + Pages Router) |
| `@novu/js` | Vanilla JavaScript / non-React frameworks |

## React Quick Start

```bash
npm install @novu/react
```

```tsx
import { Inbox } from "@novu/react";

function App() {
  return (
    <Inbox
      applicationIdentifier="YOUR_NOVU_APP_ID"
      subscriberId="subscriber-123"
      subscriberHash="HMAC_HASH"  // Required if HMAC encryption is enabled
    />
  );
}
```

This renders a bell icon with unread count. Clicking it opens a popover with the notification feed.

## Next.js

```bash
npm install @novu/nextjs
```

### App Router

```tsx
// components/NotificationInbox.tsx
"use client";

import { Inbox } from "@novu/nextjs";

export function NotificationInbox() {
  return (
    <Inbox
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_ID!}
      subscriberId="subscriber-123"
      subscriberHash="HMAC_HASH"
    />
  );
}
```

**Important:** The Inbox is a client component — use `"use client"` directive in Next.js App Router.

### Pages Router

```tsx
import { Inbox } from "@novu/nextjs";

export default function NotificationsPage() {
  return (
    <Inbox
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_ID!}
      subscriberId="subscriber-123"
      subscriberHash="HMAC_HASH"
    />
  );
}
```

## Composable Components

The `<Inbox>` component is composable. When you pass children, it acts as a context provider and you compose the UI from primitives:

| Component | Purpose |
| --- | --- |
| `<Bell />` | Bell icon with unread count |
| `<Notifications />` | Notification feed (header + list + footer) |
| `<InboxContent />` | Same as `<Notifications />` plus the Preferences page |
| `<Preferences />` | Standalone preferences panel |

```tsx
import { Inbox, Bell, Notifications, Preferences } from "@novu/react";

function App() {
  return (
    <Inbox
      applicationIdentifier="YOUR_NOVU_APP_ID"
      subscriberId="subscriber-123"
      subscriberHash="HMAC_HASH"
    >
      <Bell />
      <Notifications />
      <Preferences />
    </Inbox>
  );
}
```

Use these primitives to build a custom popover, modal, drawer, or full-page notification experience.

## Branding the Inbox

The Inbox is fully themeable via the `appearance` prop. It supports four keys:

| Key | Purpose |
| --- | --- |
| `baseTheme` | Apply a predefined theme (e.g. `dark`) |
| `variables` | Global design tokens (colors, fonts, radius, severity colors) |
| `elements` | Per-element styles (style object, class string, or context callback) |
| `icons` | Replace built-in icons with your own React components |

Styles are auto-injected into `<head>` (or the shadow root if rendered inside a shadow DOM). When both `baseTheme` and `variables` are provided, `variables` win.

> Inspiration: the [Inbox Playground](https://inbox.novu.co) showcases pre-styled variants like Notion and Reddit.

### Dark mode (and other base themes)

```tsx
import { Inbox } from "@novu/react";
import { dark } from "@novu/react/themes";

<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="subscriber-123"
  appearance={{ baseTheme: dark }}
/>
```

### Global variables

```tsx
<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="subscriber-123"
  appearance={{
    variables: {
      colorPrimary: "#0081F1",
      colorBackground: "#ffffff",
      colorForeground: "#1A1523",
      colorPrimaryForeground: "#ffffff",
      colorSecondary: "#F1F0EF",
      colorCounter: "#E5484D",
      colorCounterForeground: "#ffffff",
      colorNeutral: "#E0DEDC",
      colorShadow: "rgba(0,0,0,0.08)",
      fontSize: "14px",
      borderRadius: "8px",
      colorSeverityHigh: "#E5484D",
      colorSeverityMedium: "#F76808",
      colorSeverityLow: "#3E63DD",
    },
  }}
/>
```

### Element-level styling (Tailwind, CSS Modules, inline styles)

Each element accepts a string of class names, a style object, or a function `(context) => string` for runtime conditionals.

```tsx
import inboxStyles from "./inbox.module.css";

<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="subscriber-123"
  appearance={{
    elements: {
      bellIcon: ({ unreadCount }) =>
        unreadCount.total > 10
          ? "p-4 bg-white rounded-full [--bell-gradient-end:var(--color-red-500)]"
          : "p-4 bg-white rounded-full",
      notification: ({ notification }) =>
        notification.data?.priority === "high"
          ? "bg-red-50 ring-1 ring-red-300 rounded-lg"
          : "bg-white rounded-lg shadow-sm hover:bg-gray-50",
      notificationSubject: { fontWeight: 600 },
      notificationBody: inboxStyles.body,
    },
  }}
/>
```

> To find an element key, inspect the DOM: any class starting with `nv-` (visible just before a 🔔 emoji in DevTools) maps to a key in `appearance.elements` (drop the `nv-` prefix). TS autocomplete lists all available keys.

### Custom icons

Replace any built-in icon by returning a React component from `appearance.icons`:

```tsx
import { RiSettings3Fill, RiNotification3Fill } from "react-icons/ri";

<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="subscriber-123"
  appearance={{
    icons: {
      bell: () => <RiNotification3Fill />,
      cogs: () => <RiSettings3Fill />,
    },
  }}
/>
```

Common icon keys: `bell`, `cogs`, `dots`, `arrowDown`, `arrowDropDown`, `arrowLeft`, `arrowRight`, `check`, `clock`, `trash`, `markAsRead`, `markAsUnread`, `markAsArchived`, `markAsUnarchived`, `email`, `sms`, `push`, `inApp`, `chat`. To find more, inspect classes that start with `nv-` and contain a 🖼️ emoji.

### Severity styling

Notifications and the bell are styled by severity (`high`, `medium`, `low`). Override colors via `variables`:

> Severity is a **visual** dial only. The workflow-level `critical: true` flag is independent — it changes runtime delivery (bypass preferences, skip digest), not Inbox styling. `critical` workflows that should also stand out visually should set `severity: 'high'` explicitly. See [`design-workflow/references/severity-and-critical.md`](../design-workflow/references/severity-and-critical.md) for the full design rules.

```tsx
appearance: {
  variables: {
    colorSeverityHigh: "#E5484D",
    colorSeverityMedium: "#F76808",
    colorSeverityLow: "#3E63DD",
  },
}
```

…or per element:

```tsx
appearance: {
  elements: {
    severityHigh__notificationBar: { backgroundColor: "red" },
    severityHigh__bellContainer: "ring-2 ring-red-500",
    severityGlowHigh__bellSeverityGlow: "bg-red-500",
  },
}
```

By default the bell takes the color of the highest-severity unread notification.

### Responsive Inbox

```tsx
<Inbox
  /* ... */
  appearance={{ elements: { popoverContent: "novu-popover-content" } }}
/>
```

```css
.novu-popover-content { max-width: 500px; }
@media (max-width: 768px) { .novu-popover-content { max-width: 350px; } }
@media (max-width: 480px) { .novu-popover-content { max-width: 250px; } }
```

See [Branding & Styling Reference](./references/branding-and-styling.md) for the full variable list, severity element keys, dynamic callback signatures, and Notion/Reddit-style presets.

## Personalization

### Render props

Override individual parts of a notification — keep the surrounding chrome (action buttons, hover state, etc.) intact:

```tsx
<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="subscriber-123"
  renderBell={(unreadCount) => <MyBell count={unreadCount.total} />}
  renderAvatar={(notification) => <Avatar src={notification.avatar} />}
  renderSubject={(notification) => <strong>{notification.subject}</strong>}
  renderBody={(notification) => <p>{notification.body}</p>}
  renderDefaultActions={(notification) => <MyActions notification={notification} />}
  renderCustomActions={(notification) => (
    <PrimarySecondaryButtons notification={notification} />
  )}
/>
```

Use `renderNotification` only when you need full control of the item — you'll need to re-implement default actions (mark as read, archive, snooze) yourself.

```tsx
<Inbox
  /* ... */
  renderNotification={(notification) => (
    <div className="custom-row">
      <h3>{notification.subject}</h3>
      <p>{notification.body}</p>
    </div>
  )}
/>
```

### Conditional display

`renderNotification` receives the full notification — branch on `tags`, `data`, `severity`, or `workflow.identifier`:

```tsx
renderNotification={(notification) => {
  if (notification.severity === SeverityLevelEnum.HIGH) return <HighPriorityRow notification={notification} />;
  if (notification.tags?.includes("billing")) return <BillingRow notification={notification} />;
  if (notification.data?.priority === "high") return <UrgentRow notification={notification} />;

  return <DefaultRow notification={notification} />;
}}
```

### HTML in notification content

To render rich HTML in `subject` / `body`:

1. Disable **Disable content sanitization** in the In-App step in your workflow.
2. Render with `dangerouslySetInnerHTML` in a render prop:

```tsx
<Inbox
  /* ... */
  renderBody={(notification) => (
    <div dangerouslySetInnerHTML={{ __html: notification.body }} />
  )}
  renderSubject={(notification) => (
    <span dangerouslySetInnerHTML={{ __html: notification.subject }} />
  )}
/>
```

> Only enable this if you fully control the trigger payload — raw HTML opens an XSS surface area.

### Notification click behavior

Hook the Inbox into your router. Novu calls `routerPush` with the `redirect.url` defined in your workflow:

```tsx
import { useRouter } from "next/navigation";

const router = useRouter();

<Inbox
  /* ... */
  routerPush={(path) => router.push(path)}
  onNotificationClick={(notification) => track("inbox_notification_click", { id: notification.id })}
  onPrimaryActionClick={(notification) => doSomething(notification.primaryAction)}
  onSecondaryActionClick={(notification) => doSomethingElse(notification.secondaryAction)}
/>
```

Works with React Router (`useNavigate()`), Remix (`useNavigate()`), Gatsby (`navigate()`), and any custom router.

See [Personalization Reference](./references/personalization.md) for full render-prop signatures, `renderCustomActions` styling examples, popover composition with Radix / shadcn Drawer, and conditional UI patterns.

## Tabs

Group notifications into tabs by **tags**, **severity**, or **`data` properties**:

```tsx
import { Inbox, SeverityLevelEnum } from "@novu/react";

<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="subscriber-123"
  tabs={[
    { label: "All", filter: { tags: [] } },
    { label: "Promotions", filter: { tags: ["promotions"] } },
    { label: "Security", filter: { tags: ["security", "alert"] } },
    { label: "Critical", filter: { severity: SeverityLevelEnum.HIGH } },
    { label: "High Priority", filter: { data: { priority: "high" } } },
    {
      label: "Billing",
      filter: { tags: ["billing"], data: { entity: "invoice" } },
    },
  ]}
/>
```

- **Tags** are workflow-level — assign them in the workflow editor. Multiple tags use `OR` logic.
- **Severity** comes from the In-App step's severity setting (`HIGH`, `MEDIUM`, `LOW`).
- **`data`** comes from the [data object](#data-object) defined per In-App step.

Use the [`useCounts` hook](https://docs.novu.co/platform/sdks/react/hooks/use-counts) to render unread counts per tab.

## Multi-Tenancy with Contexts

Use **Contexts** to scope the Inbox to a tenant, workspace, or feature area. The Inbox shows only notifications whose trigger context matches the Inbox context exactly.

### 1. Trigger workflows with context

```typescript
await novu.trigger({
  workflowId: "invoice-paid",
  to: { subscriberId: "user-123" },
  payload: { amount: "$250" },
  context: {
    tenant: {
      id: "acme-corp",
      data: { name: "Acme Corporation", plan: "enterprise" },
    },
  },
});
```

### 2. Pass the matching context to the Inbox

```tsx
<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="user-123"
  subscriberHash="HMAC_HASH"
  context={{
    tenant: {
      id: "acme-corp",
      data: { name: "Acme Corporation", plan: "enterprise" },
    },
  }}
/>
```

### 3. Secure the context with `contextHash`

Because `context` is set client-side, a hostile user could swap tenant IDs. Generate an HMAC hash of the canonicalized context server-side:

```typescript
import { createHmac } from "crypto";
import { canonicalize } from "@tufjs/canonical-json";

const context = {
  tenant: { id: "acme-corp", data: { name: "Acme Corporation", plan: "enterprise" } },
};

const contextHash = createHmac("sha256", process.env.NOVU_SECRET_KEY!)
  .update(canonicalize(context))
  .digest("hex");
```

Pass it alongside the `context`:

```tsx
<Inbox
  /* ... */
  context={context}
  contextHash={contextHash}
/>
```

### Context match rules

| Workflow Context | Inbox Context | Displayed? |
| --- | --- | --- |
| `{ tenant: "acme" }` | `{ tenant: "acme" }` | ✅ |
| `{}` | `{}` | ✅ |
| `{ tenant: "acme" }` | `{}` | ❌ |
| `{}` | `{ tenant: "acme" }` | ❌ |
| `{ tenant: "acme" }` | `{ tenant: "globex" }` | ❌ |

Context that doesn't yet exist in Novu is auto-created. Existing context data is **not** auto-updated to prevent overwrites.

See [Multi-Tenancy Reference](./references/multi-tenancy.md) for full setup, dashboard management, and dynamic content rendering with `{{context}}`.

## Data Object

Each In-App step supports a custom **data object** — up to 10 scalar key-value pairs (string, number, boolean, null; strings ≤ 256 chars) defined in the workflow editor. Values can be static (`"status": "merged"`) or dynamic (`"firstName": "{{subscriber.firstName}}"`).

Access it client-side as `notification.data` and use it for render decisions, conditional styling, and tab filtering.

```tsx
<Inbox
  /* ... */
  renderNotification={(notification) => (
    <div>
      <span>{notification.data?.emoji}</span>
      <strong>{notification.data?.firstName}</strong>
      <p>{notification.body}</p>
    </div>
  )}
/>
```

Type the data object globally for autocomplete:

```ts
declare global {
  interface NotificationData {
    reactionType?: string;
    entityId?: string;
    userName?: string;
  }
}
```

> Don't store secrets in `data` — it's returned to the client. Never spread the entire trigger payload into `data`.

## Custom Popover

Mount the notification feed inside any popover, drawer, or page layout. Use `<Bell />` (or your own trigger) plus `<Notifications />` or `<InboxContent />`:

```tsx
import { Inbox, InboxContent, Bell } from "@novu/react";
import { Popover, PopoverTrigger, PopoverContent } from "@radix-ui/react-popover";

<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="subscriber-123"
>
  <Popover>
    <PopoverTrigger>
      <Bell />
    </PopoverTrigger>
    <PopoverContent className="h-[600px] w-[400px] p-0">
      <InboxContent />
    </PopoverContent>
  </Popover>
</Inbox>
```

The same pattern works with shadcn `<Drawer>`, Headless UI, or a route-level page (mount `<InboxContent />` directly without any popover). All customization props (`appearance`, `localization`, `tabs`, `routerPush`, render props) flow through the `<Inbox>` provider.

## Localization

Override Inbox UI text — useful for multi-language apps or matching your product voice:

```tsx
<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="subscriber-123"
  localization={{
    locale: "en-US",
    "inbox.filters.labels.default": "Notifications",
    "inbox.filters.dropdownOptions.unread": "Unread only",
    "notifications.emptyNotice": "You're all caught up.",
    "notifications.actions.readAll": "Mark all as read",
    "notification.actions.archive.tooltip": "Move to archive",
    "preferences.title": "Notification Preferences",
    dynamic: {
      "new-comment-on-post": "Post comments",
      "new-follower-digest": "New Follower Updates",
    },
  }}
/>
```

- Localization changes UI text only. To translate notification *content*, use [Workflow Translations](https://docs.novu.co/platform/workflow/advanced-features/translations).
- Use the `dynamic` map to localize workflow names shown in the Preferences UI.
- The full key list lives in [`defaultLocalization.ts`](https://github.com/novuhq/novu/blob/next/packages/js/src/ui/config/defaultLocalization.ts).

## HMAC Authentication

**Required in production** to prevent subscriber impersonation. See https://docs.novu.co/platform/inbox/prepare-for-production for the full guide.

### Generate the hash (server-side)

```typescript
import { createHmac } from "crypto";

const subscriberHash = createHmac("sha256", process.env.NOVU_SECRET_KEY!)
  .update(subscriberId)
  .digest("hex");
```

### Python

```python
import hmac, hashlib

subscriber_hash = hmac.new(
    NOVU_SECRET_KEY.encode(),
    subscriber_id.encode(),
    hashlib.sha256,
).hexdigest()
```

### Pass to the component

```tsx
<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="subscriber-123"
  subscriberHash={subscriberHash}
/>
```

If you also pass a `context`, generate a `contextHash` (see [Multi-Tenancy](#multi-tenancy-with-contexts)).

## Common Pitfalls

1. **`applicationIdentifier` is NOT the same as `NOVU_SECRET_KEY`** — the app ID is a public identifier safe for client-side use. The secret key is server-only.
2. **HMAC hash is mandatory in production** — without it, anyone can impersonate a subscriber by guessing their ID.
3. **The Inbox only shows notifications from workflows with an `inApp` step** — if your workflow doesn't include `step.inApp()`, nothing appears.
4. **`"use client"` is required in Next.js App Router** — the Inbox component is client-side only.
5. **Real-time updates are automatic** — the Inbox uses WebSockets internally. No additional setup needed.
6. **`@novu/react` vs `@novu/nextjs`** — use `@novu/nextjs` for Next.js apps (handles SSR edge cases), `@novu/react` for all other React apps.
7. **`variables` override `baseTheme`** — when both are set in `appearance`, variables win. Set variables in dark/light themes intentionally.
8. **Element callbacks return strings** — `(context) => string` returns class names, not style objects. For style objects use a static value.
9. **Context filtering is exact-match** — passing `context={{}}` to the Inbox hides any notification triggered with a non-empty context, and vice-versa.
10. **Don't store secrets in `notification.data`** — it's sent to the client.
11. **`renderNotification` removes default actions** — use granular render props (`renderSubject`, `renderBody`, `renderAvatar`, `renderDefaultActions`, `renderCustomActions`) when you want to keep mark-as-read / archive / snooze affordances.
12. **HTML rendering requires both steps** — disabling sanitization in the workflow *and* using `dangerouslySetInnerHTML` in a render prop. Either alone has no effect.

## References

- [Branding & Styling](./references/branding-and-styling.md) — full appearance API: themes, variables, elements, icons, severity, dynamic callbacks
- [Personalization](./references/personalization.md) — render props, custom popover (Radix, shadcn Drawer), conditional display, click handlers
- [Multi-Tenancy with Contexts](./references/multi-tenancy.md) — context-based isolation, securing contextHash, dynamic templates
- [React Inbox Examples](./references/react-inbox-examples.md)
- [Next.js Inbox Examples](./references/nextjs-inbox-examples.md)
- [Headless Inbox (Vanilla JS)](./references/headless-inbox-examples.md)
- [Security (HMAC)](./references/security.md)
