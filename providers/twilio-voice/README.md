# Novu TwilioVoice Provider

A TwilioVoice voice provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript
import { TwilioVoiceProvider } from '@novu/twilio-voice';

const provider = new TwilioVoiceProvider({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  from: process.env.TWILIO_FROM_NUMBER, // a valid twilio phone number
});

await provider.sendMessage({
  to: '0123456789',
  content: 'Message to speak',
  record: true,
  language: 'en-US',
});
```
