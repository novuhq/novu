# Nodejs Mandrill Provider

A mandrill email provider library for [@novu/stateless](https://github.com/novuhq/novu)

## Usage

```javascript
import { MandrillProvider } from '@novu/mandrill';

const provider = new MandrillProvider({
  apiKey: process.env.apiKey,
  from: process.env.email,
});
```
