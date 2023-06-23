# Novu Sendchamp Provider

A Sendchamp SMS provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { AfricasTalkingSmsProvider } from '@novu/sendchamp';

const provider = new SendchampSmsProvider({
  apiKey: process.env.Sendchamp_API_KEY,
  from: process.env.Sendchamp_FROM
  });
```
