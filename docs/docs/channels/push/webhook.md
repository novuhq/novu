---
sidebar_label: Push Webhook
sidebar_position: 5
---

# Push Webhook

Push Webhook provider is a bit different different from other push providers as it does not depend on other third party services.
Users can use their own api url as webhook url and novu will make a post request on that webhook url.

## Steps To Configure

1. Go to [integration store](https://web.novu.co/integrations) and click on `Add a provider` button. Choose `Push` channel and then `Push Webhook` provider.
2. Enter your Webhook URL. For quick testing use [this](https://webhook.site/) website.
3. Enter Secret Hmac Key. Novu will use this secret hmac key to encrypt the data using `HMAC SHA256` algorithm and send the hash as value of `x-novu-signature` header. User can use `x-novu-signature` header to test authenticity of the request. Read more [here](#checking-authenticity)
4. Click on the update button.
5. Update the subscriber credentials. Read more [here](#set-device-token)

:::info
Your webhook url should accept `POST` request.
:::

## Set Device Token

This step is a mandatory step. Other push providers have third party dependencies where a device token can be generated. But in case of push webhook provider, there is no any way to generate device token. Any random string can be used as device token.

```typescript
import { Novu, PushProviderIdEnum } from '@novu/node';

const novu = new Novu(process.env.NOVU_API_KEY);

// PushProviderIdEnum.PushWebhook = push-webhook
await novu.subscribers.setCredentials('subscriberId', PushProviderIdEnum.PushWebhook, {
  deviceTokens: ['ANY_RANDOM_STRING'],
});
```

## Checking Authenticity

```typescript
import crypto from "crypto"

// secret key added in step 3
const secretKey = "YOUR_HMAC_SECRET_KEY"

// function to handle webhook url route request
async acceptNovuPushWebHookRequest(request, response){

  const payloadSentByNovu = request.body
  const hmacHashSentByNovu = request.headers['x-novu-signature']

  const actualHashValue = crypto
    .createHmac('sha256', secretKey)
    .update(payloadSentByNovu, 'utf-8')
    .digest('hex');

  if(hmacHashSentByNovu === actualHashValue){
    // handle the notification
    console.log("Request sent by Novu")
  } else {
    throw new Error("Not a valid request")
  }
}
```
