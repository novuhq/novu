# Novu RingCentral Provider

A RingCentral sms provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { RingCentralSmsProvider } from '@novu/ringcentral';

const provider = new RingCentralSmsProvider({
  clientId: process.env.RINGCENTRAL_CLIENT_ID,
  clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET,
  isSandBox: process.env.RINGCENTRAL_IS_SANDBOX, // OPTIONAL: defaults to false
  jwtToken: process.env.RINGCENTRAL_JWT_TOKEN,
  from: process.env.RINGCENTRAL_FROM_NUMBER, // a valid ringcentral phone number
});

await provider.sendMessage({
  to: '0123456789',
  content: 'Message to send',
});
```
