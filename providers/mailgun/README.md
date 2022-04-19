# Nodejs Mailgun Provider

A mailgun email provider library for [@novu/stateless](https://github.com/novuhq/novu).

## Usage

```javascript
import { MailgunEmailProvider } from '@novu/mailgun';

const provider = new MailgunEmailProvider({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN,
  username: process.env.MAILGUN_USERNAME,
});
```
