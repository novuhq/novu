import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Push Notifications

Novu can be used to deliver push notifications to your customers devices. Both Mobile and Web push notifications are supported.

:::caution

How the users device identifiers are stored are subject to change!

:::

You can save a user's notification/device identifiers with the subscriber entity.

```ts
await novu.subscribers.identify(user.id, {
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  phone: user.phone,
  avatar: user.profile_avatar,

  // This must a be a array of device identifiers (string) specific to the provider.
  notificationIdentifiers: user.device_ids,
});
```

## Firebase Cloud Messages

Firebase Cloud Messages is a free notification delivery service provided by Google Firebase.

To enable the FCM integration, you need to get your service account key from the Firebase dashboard. You can acquire the account key JSON by selecting your project, clicking the gear icon in top of the sidebar, going to service account tab and download the JSON. Then you have to copy the contents of the file, and paste them into the Secret Key field.

The overrides field supports all [NotificationMessagePayload](https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.notificationmessagepayload.md#notificationmessagepayload_interface) values, example below.

<Tabs>
  <TabItem value="nodejs" label="Node.js" default>

  ```ts
  import { Novu } from '@novu/node';
  
  const novu = new Novu(process.env.NOVU_API_KEY);
  
  novu.trigger('event-name', {
    to: {
      subscriberId: '...'
    },
    payload: {
      abc: 'def',
    },
    overrides: {
      fcm: {
        notificationIdentifiers: ['abcda...'], // Override subscriberId notification/device identifiers 
        badge: 1, // iOS: The value of the badge on the home screen app icon, if 0 then the badge is removed.
        clickAction: 'clickity', // Android: Action associated with a user click on the notification.
        color: '#ff00ff', // Android: Hex color of the notification
        icon: 'myicon', // Android: Drawable resource id of icon, Web: URL to icon
        sound: 'custom_sound', // Android: name of custom notification sound
      },
    }
  })
  ```

  </TabItem>
</Tabs>
