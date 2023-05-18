---
sidebar_label: One Signal
sidebar_position: 1
---

# One Signal

[OneSignal](https://onesignal.com/) is a paid push notification service that supports sending messages via both [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server) (APNs) as well as [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) (FCM).

To configure the OneSignal integration, you will need an active account which has credentials for APNs, FCM or both, and have access to the `OneSignal App ID` and `Rest API Key` available via your [application's settings page](https://documentation.onesignal.com/docs/keys-and-ids).

## Set Device Token

Before triggering the notification to a subscriber(user) with push as a step in the workflow, make sure you have added the subscriber's `userId` from OneSignal as their device token. This is also referred to as the `Player ID` within the OneSignal web console:

```ts
import { Novu, PushProviderIdEnum } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.setCredentials('subscriberId', PushProviderIdEnum.OneSignal, {
  deviceTokens: ['token1', 'token2'],
});
```

## SDK Trigger Example

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
});
```

Device/notification identifiers can be set by using [setCredentials](#set-device-token) or by using the `deviceIdentifiers` field in overrides.
