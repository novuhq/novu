---
sidebar_label: FCM
sidebar_position: 1
---

# Firebase Cloud Messaging

[Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) is a free notification delivery service provided by Google Firebase.

To enable the FCM integration, you need to get your service account key from the [Firebase Console](https://console.firebase.google.com).

## Generate Service Account Key JSON

To acquire the account key JSON file for your service account

1. Select your project, click the gear icon on the top of the sidebar.
2. Head to the service account tab.
3. Click **Generate New Private Key,** then confirm by clicking **Generate Key.**
4. Clicking **Generate Key** downloads the JSON file.

After that, paste the entire JSON file content in the Service Account field of FCM provider in integration store.

Make sure your service account json content contains these fields

```ts
{
  "type": "service_account",
  "project_id": "PROJECT_ID",
  "private_key_id": "PRIVATE_KEY_ID",
  "private_key": "PRIVATE_KEY",
  "client_email": "FIREBASE_ADMIN_SDK_EMAIL",
  "client_id": "CLIENT_ID",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "CLIENT_X509_CERT_URL"
}
```

## FCM Overrides

The overrides field supports apns, android, webpush and fcmOptions overrides

| Override Field | Type / Interface | Link                                                                                           |
| -------------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| android        | AndroidConfig    | <https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.androidconfig> |
| apns           | ApnsConfig       | <https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.apnsconfig>    |
| webPush        | WebpushConfig    | <https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.webpushconfig> |
| fcmOptions     | FcmOptions       | <https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.fcmoptions>    |

## Set Device Token

Before triggering the notification to a subscriber(user) with push as a step in the workflow, make sure you have added the subscriber's device token as follows:

```ts
import { Novu, PushProviderIdEnum } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

await novu.subscribers.setCredentials('subscriberId', PushProviderIdEnum.FCM, {
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
  overrides: {
    fcm: {

      // type: 'data' => will turn this into a FCM data notification, where the payload is sent as a data notification. If type is not set, you can use the "data" override to send notification messages with optional data payload
      type: 'data',

      // URL of an image to be displayed in the notification.
      imageUrl: "https://domain.com/image.png"

      // If type is not set, you can use the "data" override to send notification messages with optional data payload
      data: {
        key: 'value',
      },

      // Check FCM Overrides section above for these types
      android: {},
      apns: {},
      webPush: {},
      fcmOptions: {}
    },
  },
});
```

Device/notification identifiers can be set by using [setCredentials](#set-device-token) or by using the `deviceIdentifiers` field in overrides.

:::info

Novu uses FCM version V1

:::
