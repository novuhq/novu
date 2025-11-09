# Novu's JavaScript SDK

The `@novu/js` package provides a JavaScript SDK for building custom inbox notification experiences.
The package provides a low-level API for interacting with the Novu platform In-App notifications.

## Installation

Install `@novu/js` npm package in your app

```bash
npm install @novu/js
```

## Getting Started

Add the below code in your application

```ts
import { Novu } from '@novu/js';

const novu = new Novu({
  applicationIdentifier: 'YOUR_NOVU_APPLICATION_IDENTIFIER',
  subscriber: 'YOUR_INTERNAL_SUBSCRIBER_ID',
});

const { data: notifications, error } = await novu.notifications.list();
```

|| Info: you can find the `applicationIdentifier` in the Novu dashboard under the API keys page.

## HMAC Encryption

When HMAC encryption is enabled in your Novu environment, you need to provide both `subscriberHash` and optionally `contextHash` to secure your requests.

### Subscriber HMAC

Generate a subscriber hash on your backend:

```ts
import { createHmac } from 'crypto';

const subscriberHash = createHmac('sha256', process.env.NOVU_API_KEY)
  .update(subscriberId)
  .digest('hex');
```

Pass it to the Novu instance:

```ts
const novu = new Novu({
  applicationIdentifier: 'YOUR_NOVU_APPLICATION_IDENTIFIER',
  subscriber: 'SUBSCRIBER_ID',
  subscriberHash: 'SUBSCRIBER_HASH_VALUE',
});
```

### Context HMAC (Optional)

If you're using the `context` option to pass additional data, generate a context hash on your backend:

```ts
import { createHmac } from 'crypto';
import { canonicalize } from '@tufjs/canonical-json';

const context = { tenant: 'acme', app: 'dashboard' };
const contextHash = createHmac('sha256', process.env.NOVU_API_KEY)
  .update(canonicalize(context))
  .digest('hex');
```

Pass both context and contextHash to the Novu instance:

```ts
const novu = new Novu({
  applicationIdentifier: 'YOUR_NOVU_APPLICATION_IDENTIFIER',
  subscriber: 'SUBSCRIBER_ID',
  subscriberHash: 'SUBSCRIBER_HASH_VALUE',
  context: { tenant: 'acme', app: 'dashboard' },
  contextHash: 'CONTEXT_HASH_VALUE',
});
```

> Note: When HMAC encryption is enabled and `context` is provided, the `contextHash` is required. The hash is order-independent, so `{a:1, b:2}` produces the same hash as `{b:2, a:1}`.
