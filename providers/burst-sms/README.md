# Novu Burst SMS Provider

A Burst SMS sms provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { BurstSmsProvider } from '@novu/burst-sms';

const provider = new BurstSmsProvider({ 
  apiKey: process.env.BURST_SMS_API_KEY,        // Your Burst SMS API Key
  secretKey: process.env.BURST_SMS_SECRET_KEY,  // Your Burst SMS API Secret
})

await provider.sendMessage({
  to: '0123456789',
  content: 'Message to send',
});
```
