# Novu WhatsappBusiness Provider

A WhatsappBusiness chat provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { WhatsAppBusinessProvider } from '@novu/whatsapp-business';

const provider = new WhatsappBusinessSmsProvider({
  accessToken: process.env.API_TOKEN,
  phoneNumberIdentification: process.env.PHONE_NUMBER_IDENTIFICATION,
});
```
