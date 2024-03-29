# Novu Ntfy Provider

A Ntfy push provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { NtfyPushProvider } from '@novu/ntfy';

const provider = new NtfyPushProvider({
  topic: 'YOUR_TOPIC',
  baseUrl: 'IGNORE_IF_NOT_SELF-HOSTING'
});
```

