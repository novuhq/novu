# Novu PushWebhook Provider

This is a library that triggers a custom webhook and shows itself as a push library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { PushWebhookPushProvider } from '@novu/push-webhook';

const provider = new PushWebhookPushProvider({
  webhookUrl: credentials.webhookUrl,
  hmacSecretKey: credentials.secretKey,
});
```
