# Nodejs Postmark Provider

A postmark email provider library for [@novu/node](https://github.com/novu-co/novu)

## Usage

```javascript
import { PostmarkEmailProvider } from '@novu/postmark';

const provider = new PostmarkEmailProvider({
  apiKey: process.env.POSTMARK_API_KEY
});
```
