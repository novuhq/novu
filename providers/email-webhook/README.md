# Novu Email Webhook Provider

This is a library that triggers a custom webhook and shows itself as an email library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { EmailWebhookProvider } from './email-webhook.provider';

const provider = new EmailWebhookProvider({
  webhookUrl: credentials.webhookUrl,
  hmacSecretKey: credentials.secretKey,
  retryDelay: 30*1000, // retry delay default : 30 seconds
  retryCount: 3, // retry count default : 3
});
```
