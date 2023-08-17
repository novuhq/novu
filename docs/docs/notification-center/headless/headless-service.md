---
sidebar_position: 1
sidebar_label: Headless Notification Center
---

# Headless Notification Center

The headless version of Novu's notification library package provides users with a lightweight solution for integrating notification functionality into their web applications. With just the essential API methods, users can easily incorporate our notification system into any framework or vanilla JavaScript project, without being constrained by our default UI or dependencies.

## Installation

```bash
npm install @novu/headless
```

Then, in your project import the headless service:

```js
import { HeadlessService, FetchResult, ISession } from '@novu/headless';
```

## Initialize the session

To use the headless service and its features, you'll need to first initialize the session:

```js
const headlessService = new HeadlessService({
  applicationIdentifier: 'APP_ID_FROM_ADMIN_PANEL',
  subscriberId: 'USER_ID',
});

headlessService.initializeSession({
  listener: (res: FetchResult<ISession>) => {
    console.log(res);
  },
  onSuccess: (session: ISession) => {
    console.log(session);
  },
  onError: (error) => {
    console.error(error);
  },
});
```

## Use your own backend and socket url

By default, Novu's hosted services of API and socket are used. Should you want, you could override them and configure your own.

```js
const headlessService = new HeadlessService({
  applicationIdentifier: 'APP_ID_FROM_ADMIN_PANEL',
  subscriberId: 'USER_ID',
  backendUrl: 'YOUR_BACKEND_URL',
  socketUrl: 'YOUR_SOCKET_URL',
});

headlessService.initializeSession({
  listener: (session) => {
    console.log(session);
  },
  onSuccess: (session) => {
    console.log(session);
  },
  onError: (error) => {
    console.error(error);
  },
});
```

## Fetch Notifications

```js
import { IPaginatedResponse, IMessage } from '@novu/headless';

headlessService.fetchNotifications({
  listener: ({ data, error, isError, isFetching, isLoading, status }) => {
    console.log({ data, error, isError, isFetching, isLoading, status });
  },
  onSuccess: (response: IPaginatedResponse<IMessage>) => {
    console.log(response.data, response.page, response.totalCount, response.pageSize);
  },
  page: 1, // page number to be fetched
});
```

:::note
fetchNotifications and other methods of the headless service should be used after initializing the session using headlessService.initializeSession
:::

## HMAC Encryption

To use the Hash-Based Message Authentication Codes pass the HMAC code to the headless service:

```js
const headlessService = new HeadlessService({
  applicationIdentifier: 'APP_ID_FROM_ADMIN_PANEL',
  subscriberId: 'USER_ID',
  subscriberHash: 'HASHED_SUBSCRIBER_ID',
});
```

:::info
To read more about HMAC Encryption, visit [here](../react/react-components#hmac-encryption)
:::

## Realtime Sockets

Novu headless library provides `listenUnseenCountChange` API to listen to real-time socket changes and get updates about new notifications added to the user's feed.

### unseen count changes

```js
headlessService.listenUnseenCountChange({
  // this will run every time there's a change in the `unseen_count` in real-time
  listener: (unseenCount: number) => {
    console.log(unseenCount);
  },
});
```

### unread count changes

```js
headlessService.listenUnreadCountChange({
  // this will run every time there's a change in the `unread_count` in real-time
  listener: (unreadCount: number) => {
    console.log(unreadCount);
  },
});
```
