# Seen Functionality Test Guide

## ✅ Successfully Implemented Features

### 1. Individual Notification `seen()` Method

**JS Package Usage:**

```typescript
import { Novu } from '@novu/js';

const novu = new Novu({ applicationIdentifier: 'YOUR_APP_ID' });

// Method 1: Using notification instance
const notification = await novu.notifications.list();
await notification.data.notifications[0].seen();

// Method 2: Using notifications service with ID
await novu.notifications.seen({ notificationId: 'notification-id' });

// Method 3: Using notifications service with instance
await novu.notifications.seen({ notification: notificationInstance });
```

**React Package Usage:**

```tsx
import { useNotifications } from '@novu/react';

function NotificationItem({ notification }) {
  const handleMarkAsSeen = async () => {
    const result = await notification.seen();

    if (result.error) {
      console.error('Failed to mark as seen:', result.error);
    } else {
      console.log('Successfully marked as seen');
    }
  };

  return (
    <div onClick={handleMarkAsSeen}>
      {notification.body}
      {!notification.isSeen && <span className="new-badge">• New</span>}
    </div>
  );
}
```

### 2. Bulk `seenAll()` Method

**JS Package Usage:**

```typescript
// Mark all notifications as seen
await novu.notifications.seenAll();

// Mark notifications with specific tags as seen
await novu.notifications.seenAll({
  tags: ['important', 'urgent'],
});

// Mark notifications with specific data filter as seen
await novu.notifications.seenAll({
  data: { category: 'alerts' },
});

// Combined filters
await novu.notifications.seenAll({
  tags: ['important'],
  data: { category: 'alerts' },
});
```

**React Package Usage:**

```tsx
import { useNotifications } from '@novu/react';

function NotificationList() {
  const { notifications, seenAll } = useNotifications({
    tags: ['important'],
  });

  const handleMarkAllAsSeen = async () => {
    const result = await seenAll();

    if (result.error) {
      console.error('Failed to mark all as seen:', result.error);
    } else {
      console.log('Successfully marked all as seen');
    }
  };

  return (
    <div>
      <button onClick={handleMarkAllAsSeen}>Mark All as Seen</button>
      {/* notification list */}
    </div>
  );
}
```

## 🔄 API Integration

Both methods use the existing `/inbox/notifications/seen` endpoint:

- **Individual `seen()`**: Calls API with `{ notificationIds: [singleId] }`
- **Bulk `seenAll()`**: Calls API with `{ tags?: string[], data?: object }`

## 🎯 Key Features

✅ **Type Safety**: Full TypeScript support with proper return types  
✅ **Error Handling**: Proper error handling with `Result<T>` pattern  
✅ **Optimistic Updates**: UI updates immediately before API response  
✅ **Event Emitters**: Emits events for real-time synchronization  
✅ **Filtering**: Support for tags and data filters in `seenAll()`  
✅ **Consistency**: Follows same pattern as existing `read()` and `readAll()` methods

## 🚀 Usage Examples

### Basic Notification Management

```tsx
function NotificationCenter() {
  const { notifications, seenAll, readAll } = useNotifications();

  return (
    <div>
      <div className="actions">
        <button onClick={seenAll}>Mark All Seen</button>
        <button onClick={readAll}>Mark All Read</button>
      </div>

      {notifications?.map((notification) => <NotificationItem key={notification.id} notification={notification} />)}
    </div>
  );
}

function NotificationItem({ notification }) {
  const handleClick = async () => {
    // Mark as seen when user interacts with notification
    if (!notification.isSeen) {
      await notification.seen();
    }

    // Navigate or perform action
    if (notification.redirect?.url) {
      window.open(notification.redirect.url, notification.redirect.target);
    }
  };

  return (
    <div className={`notification ${!notification.isSeen ? 'unseen' : ''}`} onClick={handleClick}>
      <div className="notification-content">
        {notification.subject && <h4>{notification.subject}</h4>}
        <p>{notification.body}</p>
      </div>

      {!notification.isSeen && <div className="unseen-indicator">•</div>}
    </div>
  );
}
```

### Advanced Filtering

```tsx
function ImportantNotifications() {
  const { notifications, seenAll } = useNotifications({
    tags: ['important'],
    seen: false, // Only get unseen notifications
  });

  const markImportantAsSeen = async () => {
    // This will only mark important notifications as seen
    await seenAll();
  };

  return (
    <div>
      <h3>Important Unseen Notifications ({notifications?.length || 0})</h3>
      <button onClick={markImportantAsSeen}>Mark All Important as Seen</button>
      {/* render notifications */}
    </div>
  );
}
```
