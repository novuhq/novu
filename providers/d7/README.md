# Novu D7 Provider

A D7 sms provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { D7SmsProvider } from '@novu/d7';

const provider = new D7SmsProvider({ 
  apiKey: process.env.D7_AUTH_TOKEN,        // Your D7 Auth Token
})

await provider.sendMessage({
  to: '0123456789',
  content: 'Message to send',
});
```
