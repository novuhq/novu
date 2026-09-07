# Personalization Reference

The Inbox can be personalized at every level — from swapping the bell icon, to per-row layout, to fully custom popovers and routing. This reference covers render props, click handling, conditional display, HTML content, and composing the Inbox primitives inside your own UI.

## Render props

Render props let you replace specific parts of the Inbox while keeping the surrounding chrome (default actions, hover states, animations, accessibility).

| Prop | Replaces | Keep default actions? |
| --- | --- | --- |
| `renderBell` | Bell icon | N/A |
| `renderAvatar` | Notification avatar | ✅ |
| `renderSubject` | Subject line | ✅ |
| `renderBody` | Body text | ✅ |
| `renderDefaultActions` | Mark-as-read / archive / snooze buttons | ❌ (you implement them) |
| `renderCustomActions` | Primary + secondary action buttons | ✅ |
| `renderNotification` | Entire notification row | ❌ (you implement everything) |

### `renderBell`

Receives the unread count broken down by severity:

```tsx
import { Inbox, SeverityLevelEnum } from "@novu/react";

<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="subscriber-123"
  renderBell={(unreadCount) => (
    <button className="relative p-2">
      <BellIcon />
      {unreadCount.severity[SeverityLevelEnum.HIGH] > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">
          {unreadCount.severity[SeverityLevelEnum.HIGH]}
        </span>
      )}
    </button>
  )}
/>
```

### `renderAvatar`

```tsx
<Inbox
  /* ... */
  renderAvatar={(notification) => (
    <img
      src={notification.avatar ?? "/default-avatar.png"}
      alt=""
      className="w-8 h-8 rounded-full"
    />
  )}
/>
```

### `renderSubject` / `renderBody`

```tsx
<Inbox
  /* ... */
  renderSubject={(notification) => (
    <strong className="text-sm">{notification.subject}</strong>
  )}
  renderBody={(notification) => (
    <p className="text-xs text-gray-600">{notification.body}</p>
  )}
/>
```

### `renderDefaultActions`

Replaces the built-in mark-as-read / archive / snooze affordances. **You're responsible for re-implementing them.**

```tsx
import { Inbox } from "@novu/react";
import { Archive, Check } from "lucide-react";

<Inbox
  /* ... */
  renderDefaultActions={(notification) => (
    <div className="flex gap-2">
      <button title="Mark as read"><Check className="w-4 h-4" /></button>
      <button title="Archive"><Archive className="w-4 h-4" /></button>
    </div>
  )}
/>
```

### `renderCustomActions` (primary / secondary buttons)

Useful for matching brand button styles without re-implementing default actions:

```tsx
<Inbox
  /* ... */
  renderCustomActions={(notification) => (
    <div className="flex gap-2 mt-3">
      {notification.secondaryAction && (
        <button className="px-3 py-1 rounded border border-gray-300 text-sm">
          {notification.secondaryAction.label}
        </button>
      )}
      {notification.primaryAction && (
        <button className="px-3 py-1 rounded bg-pink-500 text-white text-sm">
          {notification.primaryAction.label}
        </button>
      )}
    </div>
  )}
/>
```

### `renderNotification` (full takeover)

Use sparingly — you lose all built-in affordances:

```tsx
<Inbox
  /* ... */
  renderNotification={(notification) => (
    <article className="p-4 border-b">
      <header className="flex justify-between">
        <h3 className="font-semibold">{notification.subject}</h3>
        <time className="text-xs text-gray-500">
          {new Date(notification.createdAt).toLocaleString()}
        </time>
      </header>
      <p>{notification.body}</p>
    </article>
  )}
/>
```

## Conditional display

`renderNotification` receives the full notification object, including `tags`, `data`, `severity`, and `workflow`. Branch on whichever signal best fits the UI.

### By workflow tag

```tsx
renderNotification={(notification) => {
  if (notification.tags?.includes("billing")) {
    return <BillingRow notification={notification} />;
  }

  return <DefaultRow notification={notification} />;
}}
```

### By workflow identifier

```tsx
renderNotification={(notification) => {
  if (notification.workflow?.identifier === "comment-mention") {
    return <CommentMentionRow notification={notification} />;
  }

  return <DefaultRow notification={notification} />;
}}
```

### By data object

```tsx
renderNotification={(notification) => {
  if (notification.data?.priority === "high") {
    return (
      <div className="bg-red-50 ring-1 ring-red-300 p-3 rounded-lg">
        <strong>{notification.subject}</strong>
        <p>{notification.body}</p>
      </div>
    );
  }

  return <DefaultRow notification={notification} />;
}}
```

### By severity

```tsx
import { SeverityLevelEnum } from "@novu/react";

renderNotification={(notification) => {
  if (notification.severity === SeverityLevelEnum.HIGH) {
    return <UrgentRow notification={notification} />;
  }

  return <DefaultRow notification={notification} />;
}}
```

## HTML in notification content

By default Novu sanitizes the `subject` and `body` to prevent XSS. To allow rich HTML:

1. **In the workflow** — open the In-App step editor and toggle on **Disable content sanitization**.
2. **In the Inbox** — render the field with `dangerouslySetInnerHTML`.

> Only enable this if you fully control the trigger payload. Raw HTML opens an XSS surface area.

### Body only

```tsx
<Inbox
  /* ... */
  renderBody={(notification) => (
    <div dangerouslySetInnerHTML={{ __html: notification.body }} />
  )}
/>
```

### Subject only

```tsx
<Inbox
  /* ... */
  renderSubject={(notification) => (
    <span dangerouslySetInnerHTML={{ __html: notification.subject }} />
  )}
/>
```

### Both subject and body

```tsx
<Inbox
  /* ... */
  renderNotification={(notification) => (
    <div className="p-4 border-b">
      <h3 dangerouslySetInnerHTML={{ __html: notification.subject }} />
      <div dangerouslySetInnerHTML={{ __html: notification.body }} />
    </div>
  )}
/>
```

Example workflow content (works with both Liquid variables and HTML tags):

```html
{{subscriber.firstName}}, <b>good news!</b> Your <i>analytics dashboard</i>
is ready. <a href="https://app.example.com/analytics" target="_blank">Open it</a>.
```

## Notification click behavior

### `routerPush` integration

When a notification has a `redirect.url` defined in the workflow, Novu calls `routerPush(url)` so navigation stays inside your SPA router.

```tsx
// Next.js App Router
import { useRouter } from "next/navigation";

const router = useRouter();
<Inbox /* ... */ routerPush={(path) => router.push(path)} />;
```

```tsx
// React Router v6
import { useNavigate } from "react-router-dom";

const navigate = useNavigate();
<Inbox /* ... */ routerPush={(path) => navigate(path)} />;
```

```tsx
// Remix
import { useNavigate } from "@remix-run/react";

const navigate = useNavigate();
<Inbox /* ... */ routerPush={(path) => navigate(path)} />;
```

```tsx
// Gatsby
import { navigate } from "gatsby";

<Inbox /* ... */ routerPush={(path) => navigate(path)} />;
```

### `onNotificationClick`

Override click behavior entirely (open a drawer, modal, etc.):

```tsx
<Inbox
  /* ... */
  onNotificationClick={(notification) => {
    if (notification.data?.entity === "issue") {
      openIssueDrawer(notification.data.entityId);

      return;
    }

    if (notification.redirect?.url) {
      window.location.href = notification.redirect.url;
    }
  }}
/>
```

### `onPrimaryActionClick` / `onSecondaryActionClick`

```tsx
<Inbox
  /* ... */
  onPrimaryActionClick={(notification) => acceptInvite(notification.data.inviteId)}
  onSecondaryActionClick={(notification) => declineInvite(notification.data.inviteId)}
/>
```

## Custom popover

The `<Inbox>` component is composable. When passed children, it acts as a context provider — drop the feed into any popover, drawer, or page.

| Component | Renders |
| --- | --- |
| `<Bell />` | Bell icon trigger |
| `<Notifications />` | Header + scrollable list + footer (no Preferences page) |
| `<InboxContent />` | Same as `<Notifications />` plus the Preferences page |
| `<Preferences />` | Standalone preferences |

### Standalone notification feed (no popover)

```tsx
import { Inbox, Notifications } from "@novu/react";

<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="subscriber-123"
>
  <Notifications />
</Inbox>
```

### Popover with Radix UI

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

### Custom popover with shadcn Drawer

```tsx
"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Inbox, InboxContent } from "@novu/react";

export function NotificationDrawer() {
  return (
    <Inbox
      applicationIdentifier="YOUR_NOVU_APP_ID"
      subscriberId="subscriber-123"
    >
      <Drawer direction="right">
        <DrawerTrigger className="rounded-full border px-4 py-2">
          Notifications
        </DrawerTrigger>
        <DrawerContent className="w-[400px]">
          <DrawerHeader>
            <DrawerTitle>Inbox</DrawerTitle>
          </DrawerHeader>
          <InboxContent />
        </DrawerContent>
      </Drawer>
    </Inbox>
  );
}
```

### Full-page notification center

```tsx
import { Inbox, InboxContent } from "@novu/react";

export default function NotificationsPage() {
  return (
    <main className="max-w-3xl mx-auto py-12">
      <h1 className="text-2xl font-semibold mb-6">Notifications</h1>
      <Inbox
        applicationIdentifier="YOUR_NOVU_APP_ID"
        subscriberId="subscriber-123"
      >
        <InboxContent />
      </Inbox>
    </main>
  );
}
```

All customization props (`appearance`, `localization`, `tabs`, `routerPush`, render props, `context`) flow through the `<Inbox>` provider and apply to children automatically.

## Localization

Override Inbox UI text per locale. Localization changes UI chrome only — to translate notification *content*, use [Workflow Translations](https://docs.novu.co/platform/workflow/advanced-features/translations).

```tsx
<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="subscriber-123"
  localization={{
    locale: "en-US",
    "inbox.filters.labels.default": "Notifications",
    "inbox.filters.labels.unread": "Unread",
    "inbox.filters.labels.archived": "Archived",
    "inbox.filters.labels.snoozed": "Snoozed",
    "inbox.filters.dropdownOptions.unread": "Unread only",
    "inbox.filters.dropdownOptions.default": "All",
    "notifications.emptyNotice": "You're all caught up.",
    "notifications.actions.readAll": "Mark all as read",
    "notifications.actions.archiveAll": "Archive all",
    "notifications.actions.archiveRead": "Archive read",
    "notification.actions.read.tooltip": "Mark as read",
    "notification.actions.unread.tooltip": "Mark as unread",
    "notification.actions.archive.tooltip": "Archive",
    "notification.actions.unarchive.tooltip": "Unarchive",
    "notification.actions.snooze.tooltip": "Snooze",
    "notification.actions.unsnooze.tooltip": "Unsnooze",
    "notification.snoozedUntil": "Snoozed until",
    "snooze.options.anHourFromNow": "An hour from now",
    "snooze.options.inOneDay": "Tomorrow",
    "snooze.options.inOneWeek": "Next week",
    "snooze.options.customTime": "Custom time...",
    "preferences.title": "Notification Preferences",
    "preferences.global": "Global Preferences",
    "preferences.emptyNotice": "No notification specific preferences yet.",
    dynamic: {
      "new-comment-on-post": "Post comments",
      "new-follower-digest": "New Follower Updates",
    },
  }}
/>
```

The full key list is in [`defaultLocalization.ts`](https://github.com/novuhq/novu/blob/next/packages/js/src/ui/config/defaultLocalization.ts).

### Localizing workflow names

`localization.dynamic` is a `Record<workflowId, string>` used to display friendly workflow names in the Preferences UI:

```tsx
localization={{
  dynamic: {
    "weekly-digest": "Weekly Digest",
    "team-mention": "Team Mentions",
  },
}}
```

### Multi-language switching pattern

```tsx
const [locale, setLocale] = useState("en-US");

const localizationByLocale = {
  "en-US": { "preferences.title": "Notification Preferences", locale: "en-US" },
  "es-ES": { "preferences.title": "Preferencias de Notificación", locale: "es-ES" },
  "fr-FR": { "preferences.title": "Préférences de Notification", locale: "fr-FR" },
};

<Inbox
  /* ... */
  localization={localizationByLocale[locale]}
/>;
```

## Tabs

Group notifications into filtered tabs:

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
      label: "Billing High",
      filter: { tags: ["billing"], data: { priority: "high" } },
    },
  ]}
/>;
```

- `tags`: workflow-level. Multiple tags use `OR` logic.
- `severity`: from the In-App step's severity. Accepts a single value or an array.
- `data`: matches keys defined in the In-App step's data object.
- Combine `tags` + `data` + `severity` for narrower filters.

To show counts per tab, use the [`useCounts` hook](https://docs.novu.co/platform/sdks/react/hooks/use-counts).

## Recipe: brand-aligned, fully personalized Inbox

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Inbox, SeverityLevelEnum } from "@novu/react";
import { dark } from "@novu/react/themes";

export function BrandedInbox({ subscriberId, subscriberHash }) {
  const router = useRouter();

  return (
    <Inbox
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_ID!}
      subscriberId={subscriberId}
      subscriberHash={subscriberHash}
      routerPush={(path) => router.push(path)}
      tabs={[
        { label: "All", filter: { tags: [] } },
        { label: "Mentions", filter: { tags: ["mention"] } },
        { label: "Critical", filter: { severity: SeverityLevelEnum.HIGH } },
      ]}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#FB4CA3",
          colorPrimaryForeground: "#FFFFFF",
          borderRadius: "12px",
        },
        elements: {
          notification: ({ notification }) =>
            notification.data?.priority === "high"
              ? "bg-red-500/10 ring-1 ring-red-500/30"
              : "",
          notificationPrimaryAction__button: "bg-pink-500 hover:bg-pink-600",
        },
      }}
      renderAvatar={(notification) => (
        <img
          src={notification.avatar ?? "/default-avatar.png"}
          alt=""
          className="w-8 h-8 rounded-full ring-1 ring-white/10"
        />
      )}
      localization={{
        locale: "en-US",
        "inbox.filters.labels.default": "All",
        "notifications.emptyNotice": "Nothing new — you're all caught up.",
      }}
    />
  );
}
```
