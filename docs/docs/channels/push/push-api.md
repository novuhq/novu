---
sidebar_label: PushAPI
sidebar_position: 1
---

# Web APIs - PushAPI

[MDN PushAPI](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

To enable the PushAPI integration, you need to generate VAPID Private/Public keys to be used to encrypt/decrypt your push payload. See the help documentation on [w3.org](https://www.w3.org/TR/push-api/#push-subscription) to learn how to use a push subscription.

## Generate a VAPID key pair

To generate a key pair using the ECDH signature algorithm, run the following commands:

1. `openssl ecparam -out ecprivate.pem -name prime256v1`
1. `openssl genpkey -paramfile ecprivate.pem -out ecdhkey.pem`

After that, paste the contents of each output to the Private Key and Public Key fields for the Push API integration page.

## Set Device Token

Before triggering the notification to a subscriber(user) with push as a step in the workflow, make sure you have added the subscriber's device token as follows:

```ts
import { Novu, PushProviderIdEnum } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

// request access to notifications API and get subscription
const subscriptionJSON = JSON.stringify(subscription);

await novu.subscribers.setCredentials('subscriberId', PushProviderIdEnum.FCM, {
  deviceTokens: [subscriptionJSON],
});
```

:::info

Note that `endpoint1` is a string encoded JSON object containing the push subscription received from the browser by requesting permission for receiving notifications. It will look something like:

```json
{
  "endpoint": "<some_endpoint_string>",
  "keys": {
    "p256dh": "<encryption_public_key>",
    "auth": "<encrypted_auth>"
  }
}
```

:::

See [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe) for more information and examples regarding this process.

Device/notification identifiers can be set by using [setCredentials](#set-device-token) or by using the `deviceIdentifiers` field in overrides.
