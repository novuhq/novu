# EmailJs Email Provider

An [emailjs](https://github.com/eleith/emailjs) email provider library for [novu](https://github.com/novuhq/novu).

## Usage

```javascript
import { EmailJsProvider } from '@novu/emailjs';

const provider = new EmailJsProvider({
  from: process.env.EMAILJS_FROM_EMAIL,
  host: process.env.EMAILJS_HOST,
  user: process.env.EMAILJS_USERNAME,
  password: process.env.EMAILJS_PASSWORD,
  port: process.env.EMAILJS_PORT,
  secure: process.env.EMAILJS_SECURE,
});
```
