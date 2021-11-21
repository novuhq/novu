# Nodejs Mandrill Provider

A mandrill email provider library for [@notifire/core](https://github.com/notifirehq/notifire)

## Usage

```javascript
import { MandrillProvider } from '@notifire/mandrill';

const provider = new MandrillProvider({
  apiKey: process.env.apiKey,
  from: process.env.email
});
```
