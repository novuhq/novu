# Nodejs Plivo Provider

A plivo sms provider library for [@notifire/core](https://github.com/notifirehq/notifire).

## Usage

```javascript
import { PlivoSmsProvider } from '@notifire/plivo';

const provider = new PlivoSmsProvider({
  accountSid: process.env.PLIVO_ACCOUNT_ID,
  authToken: process.env.PLIVO_AUTH_TOKEN,
  from: process.env.PLIVO_FROM_NUMBER, // a valid plivo phone number
});
```
