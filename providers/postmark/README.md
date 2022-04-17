# Nodejs Postmark Provider

A postmark email provider library for [@novu/stateless](https://github.com/novuhq/novu)

## Usage

```javascript
import { PostmarkEmailProvider } from '@novu/postmark';

const provider = new PostmarkEmailProvider({
  apiKey: process.env.POSTMARK_API_KEY
});
```
