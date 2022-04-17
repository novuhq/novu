# Nodejs SendGrid Provider

A sendgrid email provider library for [@novu/stateless](https://github.com/novuhq/novu)

## Usage

```javascript
import { SendgridEmailProvider } from '@novu/sendgrid';

const provider = new SendgridEmailProvider({
  apiKey: process.env.SENDGRID_API_KEY
});
```
