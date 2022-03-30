# Novu Nexmo Provider

A Nexmo SMS provider library for [@novu/node](https://github.com/notifirehq/novu)

## Usage

```javascript
import { NexmoSmsProvider } from '@novu/nexmo';

const provider = new NexmoSmsProvider({
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
  from: process.env.VONAGE_FROM_NUMBER, // a valid Vonage phone number
});
```
