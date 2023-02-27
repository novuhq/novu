# Nodejs Custom SMTP Provider

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

## Advanced configuration

To take advantage of the different advanced configurations of TLS options you can set up the following properties with their corresponding environment variable:

- ignoreTls: NODEMAILER_IGNORE_TLS -> Boolean

```sh
# .env
NODEMAILER_IGNORE_TLS=true
```

- requireTls: NODEMAILER_REQUIRE_TLS -> Boolean

```sh
# .env
NODEMAILER_REQUIRE_TLS=true
```

- tlsOptions: NODEMAILER_TLS_OPTIONS -> JSON

```sh
# .env
NODEMAILER_TLS_OPTIONS={"rejectUnauthorized":false}
```

```javascript
import { NodemailerProvider } from '@novu/nodemailer';

const provider = new NodemailerProvider({
  from: process.env.NODEMAILER_FROM_EMAIL,
  host: process.env.NODEMAILER_HOST,
  user: process.env.NODEMAILER_USERNAME,
  password: process.env.NODEMAILER_PASSWORD,
  port: process.env.NODEMAILER_PORT,
  secure: process.env.NODEMAILER_SECURE,
  ignoreTls: process.env.NODEMAILER_IGNORE_TLS,
  requireTls: process.env.NODEMAILER_REQUIRE_TLS,
  tlsOptions: process.env.NODEMAILER_TLS_OPTIONS,
});
```

You can read more details of the different possible configurations in [Nodemailer documentation](https://nodemailer.com/smtp/#tls-options)
