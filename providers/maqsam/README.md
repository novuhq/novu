# Nodejs Maqsam Provider

A mapsam sms provider library for [@novu/stateless](https://github.com/novuhq/novu).

## Usage

```javascript
import { MaqsamSmsProvider } from '@novu/maqsam';

const provider = new MaqsamSmsProvider({
  accessKeyId: process.env.MAQSAM_ACCESS_KEY_ID,
  accessSecret: process.env.MAQSAM_ACCESS_SECRET,
  from: process.env.MAQSAM_SENDER_ID, // a valid twilio phone number
});

await provider.sendMessage({
  to: '0123456789',
  content: 'Message to send',
});
```
