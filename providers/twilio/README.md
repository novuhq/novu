# Nodejs Twilio Provider

A twilio email provider library for [@notifire/core](https://github.com/notifirehq/notifire)

## Usage

```javascript
import { TwilioSmsProvider } from '@notifire/twilio';

const provider = new TwilioSmsProvider({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  from: process.env.TWILIO_FROM_NUMBER // a valid twilio phone number
});
```
