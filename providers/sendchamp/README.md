# Novu Sendchamp Provider

A Sendchamp SMS provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { SendchampSmsProvider } from '@novu/sendchamp';

const provider = new SendchampSmsProvider({
  apiKey: process.env.SENDCHAMP_API_KEY,
  from: process.env.SENDCHAMP_FROM
  });
```
