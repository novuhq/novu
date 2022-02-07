# Notifire Telnyx Provider

A Telnyx sms provider library for [@notifire/core](https://github.com/notifirehq/notifire)

## Usage

```javascript
import { TelnyxSmsProvider } from '@notifire/telnyx';

const provider = new TelnyxSmsProvider({
  apiKey: process.env.TELNYX_API_KEY,
  messageProfileId: process.env.TELNYX_MESSAGE_PROFILE_ID,
  from: process.env.FROM, // an alphanumeric sender Id 
});
```

