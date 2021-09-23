# Nodejs SendGrid Provider

A sendgrid email provider library for [@notifire/core](https://github.com/notifirehq/notifire)

## Usage

```javascript
import { SendgridEmailProvider } from '@notifire/sendgrid';

const provider = new SendgridEmailProvider({
  apiKey: process.env.SENDGRID_API_KEY
});
```
