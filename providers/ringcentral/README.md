# Novu Ringcentral Provider

A Ringcentral sms provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { TwilioSmsProvider } from '@novu/ringcentral';

const provider = new RingCentralSmsProvider({
    server: process.env.RINGCENTRAL_SERVER,
    clientId: process.env.RINGCENTRAL_CLIENT_ID,
    clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET,
    username: process.env.RINGCENTRAL_USERNAME,
    password: process.env.RINGCENTRAL_PASSWORD,
    extension: process.env.RINGCENTRAL_EXTENSION,
  });
```
