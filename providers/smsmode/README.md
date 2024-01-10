# Novu smsmode Provider

A smsmode sms provider library for [@novu/stateless](https://github.com/novuhq/novu)

## Usage

```javascript
import { SmsmodeSmsProvider } from '@novu/smsmode';

const provider = new BrevoSmsProvider({
  apiKey: process.env.SMSMODE_API_KEY,
  from: process.env.SMSMODE_FROM, // Sender displayed to the recipient
});

await provider.sendMessage({
  to: 'My Company',
  content: 'Message to send',
});
```
