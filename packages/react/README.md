# Novu's React SDK for building custom inbox notification experiences.

Novu provides the `@novu/react` a React library that helps to add a fully functioning Inbox to your web application in minutes. Let's do a quick recap on how you can easily use it in your application.
See full documentation [here](https://docs.novu.co/inbox/react/get-started).

## Installation

- Install `@novu/react` npm package in your react app

```bash
npm install @novu/react
```

## Getting Started

- Add the below code in the app.tsx file

```jsx
import { Inbox } from '@novu/react';

function Novu() {
  return (
    <Inbox
      options={{
        subscriberId: 'SUBSCRIBER_ID',
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
        subscriberId: 'SUBSCRIBER_ID',
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
          subscriberId: 'SUBSCRIBER_ID',
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
        subscriberId: 'SUBSCRIBER_ID',
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

When Novu's user adds the Inbox to their application they are required to pass a `subscriberId` which identifies the user's end-customer, and the application Identifier which is acted as a public key to communicate with the notification feed API.

A malicious actor can access the user feed by accessing the API and passing another `subscriberId` using the public application identifier.

HMAC encryption will make sure that a `subscriberId` is encrypted using the secret API key, and those will prevent malicious actors from impersonating users.

### Enabling HMAC Encryption

In order to enable Hash-Based Message Authentication Codes, you need to visit the admin panel In-App settings page and enable HMAC encryption for your environment.

<Frame caption="How to enable HMAC encryption for In-App Inbox">
  <img src="/images/notification-center/client/react/get-started/hmac-encryption-enable.png" />
</Frame>

1. Next step would be to generate an HMAC encrypted subscriberId on your backend:

```jsx
import { createHmac } from 'crypto';

const hmacHash = createHmac('sha256', process.env.NOVU_API_KEY).update(subscriberId).digest('hex');
```

2. Then pass the created HMAC to your client side application forward it to the component:

```jsx
<Inbox
  subscriberId={'SUBSCRIBER_ID_PLAIN_VALUE'}
  subscriberHash={'SUBSCRIBER_ID_HASH_VALUE'}
  applicationIdentifier={'APPLICATION_IDENTIFIER'}
/>
```

> Note: If HMAC encryption is active in In-App provider settings and `subscriberHash`
> along with `subscriberId` is not provided, then Inbox will not load
