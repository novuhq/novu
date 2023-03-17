# Firebase Cloud Messaging

[Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) is a free notification delivery service provided by Google Firebase.

To enable the FCM integration, you need to get your service account key from the [Firebase Console](https://console.firebase.google.com).

To acquire the account key JSON file for your service account:
<br />

1. Select your project, click the gear icon on the top of the sidebar.
2. Head to the service account tab.
3. Click **Generate New Private Key,** then confirm by clicking **Generate Key.**
4. Clicking **Generate Key** downloads the JSON file.

After that, paste the entire JSON file in the Service Account field.

The overrides field supports all [NotificationMessagePayload](https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.notificationmessagepayload.md#notificationmessagepayload_interface) values, example below.

Device/notification identifiers can be set by using [Subscriber Credentials](/platform/subscribers#updating-subscriber-credentials) or by using the `deviceIdentifiers` field in overrides.

```ts
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

novu.trigger('event-name', {
  to: {
    subscriberId: '...',
  },
  payload: {
    abc: 'def', // If the notification is a data notification, the payload will be sent as the data
  },
  overrides: {
    fcm: {
      type: 'notification',
      // type: 'data' => will turn this into a FCM data notification, where the payload is sent as a data notification
      data: {
        key: 'value',
        // If type is "notification", you can use the "data" override to send notification messages with optional data payload
      },
    },
  },
});
```

Before triggering the notification to a subscriber(user) with push as a step in the workflow, make sure you have added the subscriber's device token as follows:

```ts
import { Novu, PushProviderIdEnum } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.setCredentials('subscriberId', PushProviderIdEnum.FCM, {
  deviceTokens: ['token1', 'token2'],
});
```

:::info

Novu uses FCM version V1

:::
