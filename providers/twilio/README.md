# Nodejs Twilio Provider

A twilio sms provider library for [@novu/stateless](https://github.com/novuhq/novu).

## Usage

```javascript
import { TwilioSmsProvider } from '@novu/twilio';

const provider = new TwilioSmsProvider({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  from: process.env.TWILIO_FROM_NUMBER, // a valid twilio phone number
});

await provider.sendMessage({
  to: '0123456789',
  content: 'Message to send',
});
```
