# React Inbox Examples

## Basic Inbox

```tsx
import { Inbox } from "@novu/react";

function App() {
  return (
    <Inbox
      applicationIdentifier={process.env.REACT_APP_NOVU_APP_ID!}
      subscriberId="subscriber-123"
      subscriberHash="hmac-hash-from-server"
    />
  );
}
```

## Custom Bell Icon

```tsx
import { Inbox } from "@novu/react";

function App() {
  return (
    <Inbox
      applicationIdentifier={process.env.REACT_APP_NOVU_APP_ID!}
      subscriberId="subscriber-123"
      renderBell={(unreadCount) => (
        <button className="bell-button">
          <BellIcon />
          {unreadCount > 0 && (
            <span className="badge">{unreadCount}</span>
          )}
        </button>
      )}
    />
  );
}
```

## Custom Notification Rendering

```tsx
import { Inbox } from "@novu/react";

function App() {
  return (
    <Inbox
      applicationIdentifier={process.env.REACT_APP_NOVU_APP_ID!}
      subscriberId="subscriber-123"
      renderNotification={(notification) => (
        <div className="notification-item">
          {notification.avatar && (
            <img src={notification.avatar} alt="" className="avatar" />
          )}
          <div className="content">
            {notification.subject && <h4>{notification.subject}</h4>}
            <p>{notification.body}</p>
            <time>{new Date(notification.createdAt).toLocaleString()}</time>
          </div>
        </div>
      )}
    />
  );
}
```

## Granular Render Customization

Customize individual parts instead of the entire notification:

```tsx
<Inbox
  applicationIdentifier={process.env.REACT_APP_NOVU_APP_ID!}
  subscriberId="subscriber-123"
  renderAvatar={(notification) => (
    <img src={notification.avatar || "/default-avatar.png"} className="avatar" />
  )}
  renderSubject={(notification) => (
    <strong className="custom-subject">{notification.subject}</strong>
  )}
  renderBody={(notification) => (
    <p className="custom-body">{notification.body}</p>
  )}
  renderDefaultActions={(notification) => (
    <div className="actions">
      {notification.primaryAction && (
        <button onClick={() => notification.primaryAction?.redirect?.url}>
          {notification.primaryAction.label}
        </button>
      )}
    </div>
  )}
/>
```

## Event Handlers

```tsx
<Inbox
  applicationIdentifier={process.env.REACT_APP_NOVU_APP_ID!}
  subscriberId="subscriber-123"
  onNotificationClick={(notification) => {
    console.log("Clicked:", notification.id);
    if (notification.redirect?.url) {
      window.location.href = notification.redirect.url;
    }
  }}
  onPrimaryActionClick={(notification) => {
    console.log("Primary action:", notification.primaryAction?.label);
  }}
  onSecondaryActionClick={(notification) => {
    console.log("Secondary action:", notification.secondaryAction?.label);
  }}
/>
```

## Themed Inbox

```tsx
<Inbox
  applicationIdentifier={process.env.REACT_APP_NOVU_APP_ID!}
  subscriberId="subscriber-123"
  appearance={{
    variables: {
      colorPrimary: "#6366F1",
      colorBackground: "#1E1B4B",
      colorForeground: "#E0E7FF",
      fontSize: "14px",
      borderRadius: "12px",
    },
  }}
/>
```

## Composable Components

Use child components for full layout control:

```tsx
import { Inbox, Bell, Notifications, Preferences } from "@novu/react";

function NotificationCenter() {
  return (
    <Inbox
      applicationIdentifier={process.env.REACT_APP_NOVU_APP_ID!}
      subscriberId="subscriber-123"
    >
      <Bell />
      <Notifications />
      <Preferences />
    </Inbox>
  );
}
```
