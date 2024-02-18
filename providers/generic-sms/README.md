# Novu GenericSms Provider

A Generic sms provider library for [@novu/node](https://github.com/novuhq/novu)

## Usage

```javascript

import { GenericSmsProvider } from './generic-sms.provider';

const provider = new GenericSmsProvider({
  baseUrl: 'https://api.generic-sms-provider.com',
  apiKeyRequestHeader: 'apiKey',
  apiKey: '123456',
  from: 'sender-id',
  idPath: 'message.id',
  datePath: 'message.date',
});

await provider.sendMessage({
  to: '+1234567890',
  content: 'SMS Content form Generic SMS Provider',
});
```

## Options
```typescript

interface GenericSmsProviderOptions {
  baseUrl: string;
  apiKeyRequestHeader: string;
  apiKey: string;
  secretKeyRequestHeader?: string;
  secretKey?: string;
  from: string;
  idPath?: string;
  datePath?: string;
  domain?: string;
  authenticateByToken?: boolean;
  authenticationTokenKey?: string;
}

```
