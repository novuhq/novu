# Novu Eazy SMS Provider

A EazySms sms provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { EazySmsProvider } from '@novu/eazy-sms';

const provider = new EazySmsProvider({
    apiKey: process.env.API_KEY,
    channelId: process.env.CHANNEL_ID,
});
```
