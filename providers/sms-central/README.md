# Novu SmsCentral Provider

A SmsCentral sms provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage


```javascript
  import { ResendEmailProvider } from '@novu/resend';
  const provider = new SmsCentralSmsProvider({
    username: process.env.SMS_CENTRAL_USER,
    password: process.env.SMS_CENTRAL_PASS
  });
```
