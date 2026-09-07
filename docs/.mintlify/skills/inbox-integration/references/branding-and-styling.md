# Branding & Styling Reference

The Inbox component is fully themeable through the `appearance` prop. This reference covers every level of customization — from dropping in a base theme to building dynamic, severity-aware, brand-perfect styles.

> Inspiration: [inbox.novu.co](https://inbox.novu.co) showcases pre-built variants like Notion and Reddit.

## The `appearance` prop

```ts
type Appearance = {
  baseTheme?: BaseTheme;
  variables?: Variables;
  elements?: Record<string, string | StyleObject | ((ctx) => string)>;
  icons?: Record<string, () => ReactNode>;
};
```

| Key | Purpose |
| --- | --- |
| `baseTheme` | Start from a predefined theme (e.g. `dark`) |
| `variables` | Global design tokens (colors, fonts, radius, severity colors) |
| `elements` | Per-element styles — string, style object, or callback |
| `icons` | Replace built-in icons with your own React components |

When both `baseTheme` and `variables` are set, **variables win**.

Styles are auto-injected into `<head>`. If the Inbox is rendered inside a shadow DOM, styles are scoped to that shadow root.

## Base themes

Novu currently ships a `dark` base theme:

```tsx
import { Inbox } from "@novu/react";
import { dark } from "@novu/react/themes";

<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="subscriber-123"
  appearance={{ baseTheme: dark }}
/>
```

Compose `baseTheme` + `variables` to start from a theme and tweak just a few tokens:

```tsx
appearance={{
  baseTheme: dark,
  variables: { colorPrimary: "#FB4CA3", borderRadius: "12px" },
}}
```

## Variables (design tokens)

| Variable | Description |
| --- | --- |
| `colorBackground` | Inbox background |
| `colorForeground` | Primary text color |
| `colorPrimary` | Accent color for interactive elements |
| `colorPrimaryForeground` | Text on primary surfaces |
| `colorSecondary` | Less prominent surfaces |
| `colorSecondaryForeground` | Text on secondary surfaces |
| `colorCounter` | Background of unread counters |
| `colorCounterForeground` | Text inside counters |
| `colorNeutral` | Borders and neutral surfaces |
| `colorShadow` | Shadow color |
| `fontSize` | Base font size |
| `borderRadius` | Border radius applied across elements |
| `colorSeverityHigh` | High-severity accent |
| `colorSeverityMedium` | Medium-severity accent |
| `colorSeverityLow` | Low-severity accent |

```tsx
appearance={{
  variables: {
    colorBackground: "#0B0B0F",
    colorForeground: "#F4F4F6",
    colorPrimary: "#FB4CA3",
    colorPrimaryForeground: "#FFFFFF",
    colorSecondary: "#1A1A22",
    colorSecondaryForeground: "#A1A1AA",
    colorCounter: "#FB4CA3",
    colorCounterForeground: "#FFFFFF",
    colorNeutral: "#27272A",
    colorShadow: "rgba(0, 0, 0, 0.4)",
    fontSize: "14px",
    borderRadius: "10px",
    colorSeverityHigh: "#E5484D",
    colorSeverityMedium: "#F76808",
    colorSeverityLow: "#3E63DD",
  },
}}
```

## Element-level styling

Each key in `appearance.elements` accepts:

- **String of class names** — CSS, CSS Modules, Tailwind
- **Style object** — inline CSS
- **Callback** — `(context) => string` returning class names, evaluated on every render with the relevant context (notification, unreadCount, preference, schedule)

### Inline style object

```tsx
appearance={{
  elements: {
    notificationSubject: { color: "#ff0000", fontWeight: 600 },
  },
}}
```

### Tailwind classes

```tsx
appearance={{
  elements: {
    bellIcon: "p-4 bg-white rounded-full",
    notification: "bg-white rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50",
    notificationPrimaryAction__button: "bg-pink-500 text-white px-3 py-1 rounded",
  },
}}
```

### CSS Modules

```css
/* inbox.module.css */
.bellIcon {
  padding: 1rem;
  background-color: white;
  border-radius: 50%;
}
.bellIcon:hover { background-color: #f9fafb; }

.notification {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
```

```tsx
import styles from "./inbox.module.css";

appearance={{
  elements: {
    bellIcon: styles.bellIcon,
    notification: styles.notification,
  },
}}
```

### Dynamic styling via callbacks

Callbacks receive contextual data and return class names. Use them for state-aware styles (unread count, notification severity, payload data):

```tsx
appearance={{
  elements: {
    bellIcon: ({ unreadCount }) => {
      if (unreadCount.total > 10) {
        return "[--bell-gradient-start:var(--color-red-500)] [--bell-gradient-end:var(--color-red-500)]";
      }
      if (unreadCount.total > 0) {
        return "[--bell-gradient-start:var(--color-yellow-500)] [--bell-gradient-end:var(--color-yellow-500)]";
      }

      return "[--bell-gradient-start:var(--color-gray-500)] [--bell-gradient-end:var(--color-gray-500)]";
    },
    notification: ({ notification }) =>
      notification.data?.priority === "high" ? "bg-red-50 ring-1 ring-red-300" : "",
    severityHigh__notificationBar: ({ notification }) =>
      notification.read ? "opacity-50" : "opacity-100",
  },
}}
```

### Common element keys

| Element | Key |
| --- | --- |
| Notification container | `notification` |
| Notification subject text | `notificationSubject` |
| Notification body text | `notificationBody` |
| Notification image / icon | `notificationImage` |
| Notification date | `notificationDate` |
| Notification list | `notificationList` |
| Primary action button | `notificationPrimaryAction__button` |
| Secondary action button | `notificationSecondaryAction__button` |
| Archive button | `notificationArchive__button` |
| Snooze button | `notificationSnooze__button` |
| Mark unread button | `notificationUnread__button` |
| Bell icon | `bellIcon` |
| Bell container | `bellContainer` |
| Bell dot (unread indicator) | `bellDot` |
| Popover content | `popoverContent` |
| Preferences button | `preferences__button` |
| Schedule container | `scheduleContainer` |
| Schedule header | `scheduleHeader` |
| Schedule body / table | `scheduleBody`, `scheduleTable` |

> To find any element key, inspect the DOM. Class names starting with `nv-` (visible just before a 🔔 emoji in DevTools) map to keys in `elements`. Drop the `nv-` prefix.

### Callback context signatures

| Element group | Context |
| --- | --- |
| `bellIcon`, `bellContainer`, `bellDot`, `bellSeverityGlow`, `severity*__bellContainer` | `{ unreadCount: { total: number; severity: Record<string, number> } }` |
| `notification`, `notification*`, `severity*__notification*`, `notificationDot` | `{ notification: Notification }` |
| `notificationList`, `notificationListContainer` | `{ notifications: Notification[] }` |
| `workflow*`, `channelsContainer`, `channelName` | `{ preference: Preference }` |
| `channelContainer`, `channelLabelContainer`, `channelIconContainer`, `channelLabel`, `channelSwitchContainer`, `channel__icon` | `{ preference?: Preference; preferenceGroup?: { name: string; preferences: Preference[] } }` |
| `preferencesGroup*` | `{ preferenceGroup: { name: string; preferences: Preference[] } }` |
| `preferencesContainer` | `{ preferences?: Preference[]; groups: Array<{ name: string; preferences: Preference[] }> }` |
| `schedule*`, `dayScheduleCopy*`, `timeSelect*` | `{ schedule?: Schedule }` |

## Severity styling

Notifications expose three severity levels: `high`, `medium`, `low`. Styling can be applied through variables (global colors) or elements (precise overrides).

### Severity variables

| Variable | Description |
| --- | --- |
| `colorSeverityHigh` | High severity color |
| `colorSeverityMedium` | Medium severity color |
| `colorSeverityLow` | Low severity color |

```tsx
appearance={{
  variables: {
    colorSeverityHigh: "#E5484D",
    colorSeverityMedium: "#F76808",
    colorSeverityLow: "#3E63DD",
  },
}}
```

Updating these automatically restyles both the notification accent bar and the bell glow.

### Severity element keys

| Key | Description |
| --- | --- |
| `severityHigh__bellContainer` | Bell container for high severity |
| `severityMedium__bellContainer` | Bell container for medium severity |
| `severityLow__bellContainer` | Bell container for low severity |
| `bellSeverityGlow` | Base bell glow style |
| `severityGlowHigh__bellSeverityGlow` | Glow for high severity |
| `severityGlowMedium__bellSeverityGlow` | Glow for medium severity |
| `severityGlowLow__bellSeverityGlow` | Glow for low severity |
| `severityHigh__notification` | High severity notification row |
| `severityMedium__notification` | Medium severity notification row |
| `severityLow__notification` | Low severity notification row |
| `notificationBar` | Vertical bar on the left of a notification |
| `severityHigh__notificationBar` | Bar for high severity |
| `severityMedium__notificationBar` | Bar for medium severity |
| `severityLow__notificationBar` | Bar for low severity |

```tsx
appearance={{
  elements: {
    severityHigh__notificationBar: { backgroundColor: "red" },
    severityHigh__bellContainer: "ring-2 ring-red-500",
    severityGlowHigh__bellSeverityGlow: "bg-red-500/40 blur-md",
  },
}}
```

> By default the bell takes the color of the highest-severity unread notification.

## Custom icons

Replace built-in icons with anything that renders to a React node:

```tsx
import { Inbox } from "@novu/react";
import {
  RiSettings3Fill,
  RiArrowDownLine,
  RiNotification3Fill,
} from "react-icons/ri";

<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="subscriber-123"
  appearance={{
    icons: {
      bell: () => <RiNotification3Fill />,
      cogs: () => <RiSettings3Fill />,
      arrowDown: () => <RiArrowDownLine />,
    },
  }}
/>
```

### Icon keys

| Key | Description |
| --- | --- |
| `arrowDown` | Down arrow used in drop-downs and expandable sections |
| `arrowDropDown` | Drop-down arrow in menus and selectors |
| `arrowLeft` | Left arrow used in pagination/navigation |
| `arrowRight` | Right arrow used in pagination/navigation |
| `bell` | Notification bell in the header |
| `chat` | Chat channel icon in preferences |
| `check` | Checkmark for selected items |
| `clock` | Date/time display |
| `cogs` | Settings/preferences icon |
| `dots` | Three-dot menu in notification items |
| `email` | Email channel icon in preferences |
| `inApp` | In-app channel icon in preferences |
| `markAsArchived` | Archive notification |
| `markAsArchivedRead` | Archive + read |
| `markAsRead` | Mark as read |
| `markAsUnread` | Mark as unread |
| `markAsUnarchived` | Unarchive |
| `push` | Push channel icon in preferences |
| `sms` | SMS channel icon in preferences |
| `trash` | Delete |
| `unread` | Unread indicator |
| `unsnooze` | Unsnooze indicator |

> To find more keys, inspect the DOM for class names starting with `nv-` containing a 🖼️ emoji. The part after `nv-` is the icon key.

## Responsive Inbox

```tsx
<Inbox
  applicationIdentifier="YOUR_NOVU_APP_ID"
  subscriberId="subscriber-123"
  appearance={{ elements: { popoverContent: "novu-popover-content" } }}
/>
```

```css
/* global.css */
.novu-popover-content { max-width: 500px; }

@media (max-width: 768px) { .novu-popover-content { max-width: 350px; } }
@media (max-width: 480px) { .novu-popover-content { max-width: 250px; } }
@media (max-width: 320px) { .novu-popover-content { max-width: 200px; } }
```

For a mobile drawer experience, use the [Custom Popover](./personalization.md#custom-popover-with-shadcn-drawer) pattern with shadcn's `<Drawer>`.

## Brand-presets cookbook

### Notion-style (light, calm)

```tsx
appearance={{
  variables: {
    colorBackground: "#FFFFFF",
    colorForeground: "#37352F",
    colorPrimary: "#2383E2",
    colorPrimaryForeground: "#FFFFFF",
    colorSecondary: "#F7F6F3",
    colorSecondaryForeground: "#787774",
    colorNeutral: "#E9E9E7",
    colorShadow: "rgba(15, 15, 15, 0.05)",
    fontSize: "14px",
    borderRadius: "6px",
  },
  elements: {
    notification: "hover:bg-[#F7F6F3] transition-colors",
    notificationSubject: { fontWeight: 600 },
  },
}}
```

### Reddit-style (vibrant)

```tsx
appearance={{
  variables: {
    colorPrimary: "#FF4500",
    colorPrimaryForeground: "#FFFFFF",
    colorBackground: "#FFFFFF",
    colorForeground: "#1A1A1B",
    colorSecondary: "#F6F7F8",
    colorCounter: "#FF4500",
    colorCounterForeground: "#FFFFFF",
    borderRadius: "16px",
  },
}}
```

### Brand-locked dark

```tsx
import { dark } from "@novu/react/themes";

appearance={{
  baseTheme: dark,
  variables: {
    colorPrimary: "#FB4CA3",
    colorPrimaryForeground: "#FFFFFF",
    borderRadius: "12px",
  },
}}
```
