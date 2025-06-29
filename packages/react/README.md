# Novu's React SDK for building custom inbox notification experiences.

Novu provides the `@novu/react` a React library that helps to add a fully functioning Inbox to your web application in minutes. Let's do a quick recap on how you can easily use it in your application.
Refer to the Novu documentation for the complete [React quickstart guide](https://docs.novu.co/platform/quickstart/react).

## Installation

- Install `@novu/react` npm package in your react app

```bash
npm install @novu/react
```

## Try it instantly (Keyless mode)

The keyless mode is designed for local testing and experimentation, letting you use Novu's Inbox component without any configuration. Just import and render.

```jsx
import React from 'react';
import { Inbox } from '@novu/react';

export function App() {
  return <Inbox />;
}
```

## Connect to real subscribers 

To connect the Inbox component with your Novu environment and real subscribers, set the `applicationIdentifier` and `subscriberId`

```jsx
import { Inbox } from '@novu/react';

function Novu() {
  return (
    <Inbox
      options={{
        subscriber: 'SUBSCRIBER_ID',
        applicationIdentifier: 'APPLICATION_IDENTIFIER',
      }}
    />
  );
}
```

## Use your own backend and socket URL

By default, Novu's hosted services for API and socket are used. If you want, you can override them and configure your own.

```tsx
import { Inbox } from '@novu/react';

function Novu() {
  return (
    <Inbox
      options={{
        backendUrl: 'YOUR_BACKEND_URL',
        socketUrl: 'YOUR_SOCKET_URL',
        subscriber: 'SUBSCRIBER_ID',
        applicationIdentifier: 'APPLICATION_IDENTIFIER',
      }}
    />
  );
}
```

## Controlled Inbox

You can use the `open` prop to manage the Inbox popover open state.

```jsx
import { Inbox } from '@novu/react';

function Novu() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Inbox
        options={{
          subscriber: 'SUBSCRIBER_ID',
          applicationIdentifier: 'APPLICATION_IDENTIFIER',
        }}
        open={isOpen}
      />
      <button onClick={() => setOpen(true)}>Open Inbox</button>
      <button onClick={() => setOpen(false)}>Close Inbox</button>
    </div>
  );
}
```

## Localization

You can pass the `localization` prop to the Inbox component to change the language of the Inbox.

```jsx
import { Inbox } from '@novu/react';

function Novu() {
  return (
    <Inbox
      options={{
        subscriber: 'SUBSCRIBER_ID',
        applicationIdentifier: 'APPLICATION_IDENTIFIER',
      }}
      localization={{
        'inbox.status.archived': 'Archived',
        'inbox.status.unread': 'Unread',
        'inbox.status.options.archived': 'Archived',
        'inbox.status.options.unread': 'Unread',
        'inbox.status.options.unreadRead': 'Unread/Read',
        'inbox.status.unreadRead': 'Unread/Read',
        'inbox.title': 'Inbox',
        'notifications.emptyNotice': 'No notifications',
        locale: 'en-US',
      }}
    />
  );
}
```

## HMAC Encryption

When Novu's user adds the Inbox component to their application, developers need to provide a subscriber prop with the value of their customer's subscriberId, along with an application identifier that serves as a public key for API communication.

A malicious actor can access the user feed by accessing the API and passing another `subscriberId` using the public application identifier.

HMAC encryption will make sure that a `subscriberId` is encrypted using the secret API key, and those will prevent malicious actors from impersonating users.

### Enabling HMAC Encryption

In order to enable Hash-Based Message Authentication Codes, you need to visit the admin panel In-App settings page and enable HMAC encryption for your environment.

<!-- <Frame caption="How to enable HMAC encryption for In-App Inbox">
  <img src="/images/notification-center/client/react/get-started/hmac-encryption-enable.png" />
</Frame> -->

1. Next step would be to generate an HMAC encrypted subscriberId on your backend:

```jsx
import { createHmac } from 'crypto';

const hmacHash = createHmac('sha256', process.env.NOVU_API_KEY).update(subscriberId).digest('hex');
```

2. Then pass the created HMAC to your client side application forward it to the component:

```jsx
<Inbox
  subscriber={'SUBSCRIBER_ID_PLAIN_VALUE'}
  subscriberHash={'SUBSCRIBER_ID_HASH_VALUE'}
  applicationIdentifier={'APPLICATION_IDENTIFIER'}
/>
```

> Note: If HMAC encryption is active in In-App provider settings and `subscriberHash`
> along with `subscriberId` is not provided, then Inbox will not load
