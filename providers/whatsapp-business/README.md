# Novu WhatsappBusiness Provider

A Whatsapp Business chat provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { WhatsappBusinessChatProvider } from '@novu/whatsapp-business';

const provider = new WhatsappBusinessChatProvider({
  apiKey: process.env.API_KEY,
  apiVersion: process.env.API_VERSION,
  applicationId: process.env.APPLICATION_ID,
});
```
