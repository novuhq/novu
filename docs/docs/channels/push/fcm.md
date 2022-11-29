# Firebase Cloud Messaging

[Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) is a free notification delivery service provided by Google Firebase.

To enable the FCM integration, you need to get your service account key from the [Firebase Console](https://console.firebase.google.com). You can acquire the account key JSON by selecting your project, clicking the gear icon on the top of the sidebar, going to the service account tab and downloading the JSON.

After that, paste the entire JSON file in the Service Account field.

The overrides field supports all [NotificationMessagePayload](https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.notificationmessagepayload.md#notificationmessagepayload_interface) values, example below.

Device/notification identifiers can be set by using [Subscriber Credentials](/platform/subscribers#updating-subscriber-credentials) or by using the `deviceIdentifiers` field in overrides.

<Tabs>
  <TabItem value="nodejs" label="Node.js" default>

```ts
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

novu.trigger('event-name', {
  to: {
    subscriberId: '...',
  },
  payload: {
    abc: 'def',
  },
});
```

  </TabItem>
</Tabs>

Before triggering the notification to a subscriber(user) with push as a step in the workflow, make sure you have added the subscriber's device token as follows:

```ts
import { Novu, PushProviderIdEnum } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

const body = req.body; // From your HTTPS listener
await novu.subscribers.setCredentials('subscriberId', PushProviderIdEnum.FCM, {
  deviceTokens: ['token1', 'token2'],
});
```
