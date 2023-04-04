---
sidebar_label: APNS
sidebar_position: 3
---

# Apple Push Notification Service

[Apple Push Notification Service](https://docs.expo.dev/push-notifications/overview/) is a notification delivery service provided by Apple.

Apple provides two authentication methods to make a secure connection to APNs. The first is Certificate-Based Authentication (using a .p12 certificate). The second is Token-Based Authentication (using a .p8 key). We'll make use of the **.p8** key.

To enable APNS integration, you need to create an [Apple Developer](https://developer.apple.com.) account with [Admin role](https://appstoreconnect.apple.com/access/users).

To generate the p8 key for your account:
<br />

1. Head over to **Certificates, Identifiers & Profiles > Keys**.
2. Register a new key and give it a name.
3. Enable the Apple Push Notifications service (APNs) checkbox by selecting it.
4. Click the **Continue** button and on the next page, select **Register**.
5. Download the **.p8** key file.

You also need the following to connect to APNs:

1. **Key ID** - This is a 10 character unique identifier for the authentication key. You can find it in the key details section of the newly created key in your Apple developer account.
2. **Team ID** - This is available in your Apple developer account.
3. **Bundle ID** - This is the ID of your app. You can find it in the app info section of your Apple developer account.

The overrides field supports all [Notification payload](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/generating_a_remote_notification?language=objc) values, example below:

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
    abc: 'def', // If the notification is a data notification, the payload will be sent as the data
  },
  overrides: {
    apns: {
      payload: {
        aps: {
          notification: {
            title: 'Test',
            body: 'Test push',
          },
          data: {
            key: 'value',
          },
        },
      },
    },
  },
});
```

```ts
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

novu.trigger('event-name', {
  to: {
    subscriberId: '...',
  },
  payload: {
    key1: 'val1',
    key2: 'val2', // If the notification is a data notification, the payload will be sent as the data
  },
  overrides: {
    type: 'data',
    apns: {
      headers: {
        'apns-priority': '5',
      },
      payload: {
        aps: {
          alert: {
            'loc-key': 'GAME_PLAY_REQUEST_FORMAT',
            'loc-args': ['Shelly', 'Rick'],
          },
          sound: 'demo.wav',
        },
      },
    },
  },
});
```

  </TabItem>
</Tabs>

Before triggering the notification to a subscriber(user) with push as a step in the workflow, make sure you have added the subscriber's device token as follows:

```typescript
import { Novu, PushProviderIdEnum } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.setCredentials('subscriberId', PushProviderIdEnum.APNS, {
  deviceTokens: ['token1', 'token2'],
});
```
