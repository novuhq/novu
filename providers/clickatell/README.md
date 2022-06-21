# Novu ClickatellSmsProvider Provider

A ClickatellSmsProvider sms provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { ClickatellSmsProvider } from '@novu/clickatell';

// one way sms integration
const provider = new TwilioSmsProvider({
  apiKey: process.env.CLICKATELL_API_KEY,
});

// two way sms integration
const provider = new TwilioSmsProvider({
  apiKey: process.env.CLICKATELL_API_KEY,
  isTwoWayIntegration: true
});
```
