# Novu Providers

A collection of stateless notification delivery providers, abstracting the underlying delivery provider implementation details. Independently usable, and additionally consumed by the Novu Platform.

## Installation

```bash
npm install @novu/providers
```

## Usage

The `@novu/providers` package contains a set of providers that can be used to send notifications to various channels.

The following example shows how to use the TwilioSmsProvider to send a message to a phone number.

```javascript
import { TwilioSmsProvider } from '@novu/providers';

const provider = new TwilioSmsProvider({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  from: process.env.TWILIO_FROM_NUMBER, // a valid twilio phone number
});

await provider.sendMessage({
  to: '0123456789',
  content: 'Message to send',
});
```

For all supported providers, visit the [Novu Providers package](https://github.com/novuhq/novu/tree/next/packages/providers/src/lib).
