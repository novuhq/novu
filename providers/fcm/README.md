# Novu FCM Provider

A FCM push provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

The payload field supports all [NotificationMessagePayload](https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.notificationmessagepayload.md#notificationmessagepayload_interface) values, example below.

```ts
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

novu.trigger('event-name', {
  to: {
    subscriberId: '...',
  },
  payload: {
    deviceTokens: ['abcda...'], // Override subscriberId notification/device identifiers
    badge: 1, // iOS: The value of the badge on the home screen app icon, if 0 then the badge is removed.
    clickAction: 'clickity', // Android: Action associated with a user click on the notification.
    color: '#ff00ff', // Android: Hex color of the notification
    icon: 'myicon', // Android: Drawable resource id of icon, Web: URL to icon
    sound: 'custom_sound', // Android: name of custom notification sound
  },
});
```
