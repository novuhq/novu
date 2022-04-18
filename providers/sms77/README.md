# Novu sms77 Provider

A sms77 sms provider library for [@novu/stateless](https://github.com/novuhq/novu)

## Usage

```javascript
import { Sms77SmsProvider } from '@novu/sms77';

const provider = new Sms77SmsProvider({
    apiKey: process.env.SMS77_API_KEY,
    from: process.env.SMS77_FROM, // optional
});
```
