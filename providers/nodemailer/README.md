# Nodejs Nodemailer Provider

A nodemailer email provider library for [@novu/stateless](https://github.com/novuhq/novu)

## Usage

```javascript
import { NodemailerProvider } from '@novu/nodemailer';

const provider = new NodemailerProvider({
  from: process.env.NODEMAILER_FROM_EMAIL,
  host: process.env.NODEMAILER_HOST,
  user: process.env.NODEMAILER_USERNAME,
  password: process.env.NODEMAILER_PASSWORD,
  port: process.env.NODEMAILER_PORT,
  secure: process.env.NODEMAILER_SECURE,
});
```
