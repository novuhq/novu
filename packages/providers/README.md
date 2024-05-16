<div align="center">
  <a href="https://novu.co?utm_source=github" target="_blank">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/2233092/213641039-220ac15f-f367-4d13-9eaf-56e79433b8c1.png">
    <img alt="Novu Logo" src="https://user-images.githubusercontent.com/2233092/213641043-3bbb3f21-3c53-4e67-afe5-755aeb222159.png" width="280"/>
  </picture>
  </a>
</div>

# Novu Providers

[![Version](https://img.shields.io/npm/v/@novu/providers.svg)](https://www.npmjs.org/package/@novu/providers)
[![Downloads](https://img.shields.io/npm/dm/@novu/providers.svg)](https://www.npmjs.com/package/@novu/providers)

A collection of stateless notification delivery providers, abstracting the underlying delivery provider implementation details. Independently usable, and additionally consumed by the [Novu Platform](https://novu.co/).

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
