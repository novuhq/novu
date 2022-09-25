# Novu Slack Provider

A whatsapp chat provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

````javascript
import { WhatsappProvider } from '@novu/whatsapp';

const provider = new WhatsappProvider({
  phoneNumberId: process.env.PHONE_NUMBER_ID,
  token: process.env.TOKEN,
});```
````
