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
  subscriberId: 'YOUR_INTERNAL_SUBSCRIBER_ID',
});

const { data: notifications, error } = await novu.notifications.list();
```

| Info: you can find the `applicationIdentifier` in the Novu dashboard under the API keys page.
