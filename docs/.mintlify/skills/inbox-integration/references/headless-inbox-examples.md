# Headless Inbox Examples

Use `@novu/js` for vanilla JavaScript applications or when you want full control over the UI.

## Installation

```bash
npm install @novu/js
```

## Initialize the Client

```typescript
import { Novu } from "@novu/js";

const novu = new Novu({
  applicationIdentifier: "YOUR_NOVU_APP_ID",
  subscriberId: "subscriber-123",
  subscriberHash: "hmac-hash-from-server",
});
```

## Fetch Notifications

```typescript
const { data: notifications } = await novu.notifications.list({
  limit: 20,
});

notifications.forEach((notification) => {
  console.log(notification.subject, notification.body, notification.read);
});
```

## Count Notifications

```typescript

// with single filter
const count = await novu.notifications.count({
  read: false,
  seen: false,
  archived: false,
  severity: SeverityLevelEnum.HIGH,
   // data attributes
  data: {
    type: 'login',
  },
});

// with multiple filters 

const counts = await novu.notifications.count({
  filters: [
    { read: false }, 
    { seen: false }, 
    { severity: SeverityLevelEnum.HIGH }
    { archived: true }, 
    { tags: ['tag1'] }, 
    { data: { type: 'login' } }
  ],
});
```

## Mark as Read

```typescript
// Single notification
await novu.notifications.read(notificationId);

// All notifications
await novu.notifications.readAll();
```

## Mark as Unread

```typescript
await novu.notifications.unread(notificationId);
```

## Archive

```typescript
await novu.notifications.archive(notificationId);
await novu.notifications.archiveAll();
```

## Unarchive

```typescript
await novu.notifications.unarchive(notificationId);
```

## Complete Actions

```typescript
await novu.notifications.completePrimary(notificationId);
await novu.notifications.completeSecondary(notificationId);
```

## Snooze / Unsnooze

```typescript
await novu.notifications.snooze(notificationId, { duration: "1h" });
await novu.notifications.unsnooze(notificationId);
```

## Delete

```typescript
await novu.notifications.delete(notificationId);
await novu.notifications.deleteAll();
```

## Preferences

```typescript
// List preferences
const { data: preferences } = await novu.preferences.list();

// Update a workflow preference
await novu.preferences.update({
  channels: { email: true, push: true },
  workflowId: "workflow-id",
});
```

## Real-Time Updates

The `@novu/js` client automatically maintains a WebSocket connection for real-time notification updates. No additional configuration is needed.

## Vanilla JavaScript Example

```html
<div id="notification-count"></div>
<div id="notification-list"></div>

<script type="module">
  import { Novu } from "@novu/js";

  const novu = new Novu({
    applicationIdentifier: "YOUR_NOVU_APP_ID",
    subscriberId: "subscriber-123",
    subscriberHash: "hmac-hash",
  });

  // Render notifications
  async function renderNotifications() {
    const { data: notifications } = await novu.notifications.list({ limit: 10 });
    const list = document.getElementById("notification-list");

    list.innerHTML = notifications
      .map(
        (n) => `
        <div class="notification ${n.read ? "read" : "unread"}">
          <strong>${n.subject || ""}</strong>
          <p>${n.body}</p>
        </div>
      `
      )
      .join("");

    // Update count
    const { data: counts } = await novu.notifications.count({ read: false });
    document.getElementById("notification-count").textContent = counts.count;
  }

  renderNotifications();
</script>
```
