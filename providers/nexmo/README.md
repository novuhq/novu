# Notifire Nexmo Provider

A Nexmo SMS provider library for [@notifire/core](https://github.com/notifirehq/notifire)

## Usage

```javascript
import { NexmoSmsProvider } from '@notifire/nexmo';

const provider = new NexmoSmsProvider({
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
  from: process.env.VONAGE_FROM_NUMBER, // a valid Vonage phone number
});
```
