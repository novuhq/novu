# Novu Pushpad Provider

A Pushpad push provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { PushpadPushProvider } from '@novu/pushpad';

const provider = new PushpadPushProvider({
  apiKey: process.env.PUSHPAD_AUTH_TOKEN,
  appId: process.env.PUSHPAD_PROJECT_ID
});
```
