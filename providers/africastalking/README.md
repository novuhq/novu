# Novu Africastalking Provider

Africastalking SMS provider library for [@novu/stateless](https://github.com/novuhq/novu)

## Usage

```javascript
import { AfricastalkingSmsProvider } from '@novu/africastalking';

const provider = new AfricastalkingSmsProvider({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
  from: process.env.AT_SENDER_ID,
});
```
