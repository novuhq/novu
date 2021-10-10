# Nodejs Postmark Provider

A postmark email provider library for [@notifire/core](https://github.com/notifirehq/notifire)

## Usage

```javascript
import { PostmarkEmailProvider } from '@notifire/postmark';

const provider = new PostmarkEmailProvider({
  apiKey: process.env.POSTMARK_API_KEY
});
```
