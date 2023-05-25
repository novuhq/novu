---
sidebar_label: One Signal
sidebar_position: 4
---

# One Signal

[OneSignal](https://onesignal.com/) is a paid push notification service that supports sending messages via both [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server) (APNs) as well as [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) (FCM).

To configure the OneSignal integration, you will need an active account which has credentials for APNs, FCM or both, and have access to the `OneSignal App ID` and `Rest API Key` available via your [application's settings page](https://documentation.onesignal.com/docs/keys-and-ids).

## Set Device Token

Once OneSignal has been configured with your credentials for APNs/FCM, and the OneSignal SDK has been [setup and configured](https://documentation.onesignal.com/docs/onboarding-with-onesignal#step-1-setup-onesignal-sdk) for your application, your users will begin to be automatically assigned a unique OneSignal [player_id](https://documentation.onesignal.com/docs/users#player-id) identifier by the SDK.

This identifier allows targeting your user when sending push notifications without having to retrieve the specific Android or iOS device tokens - which are managed by OneSignal.

In order to target the OneSignal user from Novu, you must register the OneSignal `player_id` as the `deviceToken` for your Novu subscriber. This value can be retrieved via the [OneSignal SDK](https://documentation.onesignal.com/docs/users-and-devices#finding-users) for your platform.

Once you have the user's `player_id` value, the `deviceToken` for your Novu subscriber can be set via:

```ts
import { Novu, PushProviderIdEnum } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.setCredentials('subscriberId', PushProviderIdEnum.OneSignal, {
  // Your user's unique 'player_id' from OneSignal
  deviceTokens: ['ad0452ca-3ca7-43b5-bf9b-fa93fd322035'],
});
```

If your user have multiple devices and you want to leave the device-to-user relationship to OneSignal, you can use `externalUserIds` override to send push notifications to target [external_user_ids](https://documentation.onesignal.com/docs/external-user-ids) and skip the registration of [player_id](https://documentation.onesignal.com/docs/users#player-id) as `deviceToken` in Novu. You must set `external_user_ids` with OneSignal [setExternalUserId](https://documentation.onesignal.com/docs/external-user-ids#setexternaluserid-method) method to associate multiple `player_id` with `external_user_id` in your client first.

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

### SDK Trigger with `externalUserIds` override Example

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
    'one-signal': {
      externalUserIds: ['external_user_ids'],
    },
  },
});
```

Device/notification identifiers can be set by using [setCredentials](#set-device-token) or by using the `deviceIdentifiers` field in overrides.
