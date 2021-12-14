# Notifire sms77 Provider

A sms77 sms provider library for [@notifire/core](https://github.com/notifirehq/notifire)

## Usage

```javascript
import { Sms77SmsProvider } from '@notifire/sms77';

const provider = new Sms77SmsProvider({
    apiKey: process.env.SMS77_API_KEY,
    from: process.env.SMS77_FROM, // optional
});
```
