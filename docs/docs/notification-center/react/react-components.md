---
sidebar_position: 1
---

import FAQ from '@site/src/components/FAQ';
import FAQItem from '@site/src/components/FAQItem';

# React Component

Novu provides the `@novu/notification-center` a React library that helps to add a fully functioning notification center to your web application in minutes. Let's do a quick recap on how we can easily use it in your application.

First you have to install the package:

```bash
npm install @novu/notification-center
```

Then import and render the components:

```tsx
import {
  NovuProvider,
  PopoverNotificationCenter,
  NotificationBell,
  IMessage,
} from '@novu/notification-center';

function Header() {
  function onNotificationClick(message: IMessage) {
    // your logic to handle the notification click
    if (message?.cta?.data?.url) {
      window.location.href = message.cta.data.url;
    }
  }

  return (
    <NovuProvider subscriberId={'USER_ID'} applicationIdentifier={'APP_ID_FROM_ADMIN_PANEL'}>
      <PopoverNotificationCenter onNotificationClick={onNotificationClick}>
        {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
      </PopoverNotificationCenter>
    </NovuProvider>
  );
}
```

The complete API reference can be found [here](./api-reference).

## Use your own backend and socket url

By default, Novu's hosted services of API and socket are used. Should you want, you could override them and configure your own.

```tsx
import {
  NovuProvider,
  PopoverNotificationCenter,
  NotificationBell,
} from '@novu/notification-center';

function Header() {
  return (
    <NovuProvider
      backendUrl={'YOUR_BACKEND_URL'}
      socketUrl={'YOUR_SOCKET_URL'}
      subscriberId={'USER_ID'}
      applicationIdentifier={'APP_ID_FROM_ADMIN_PANEL'}
    >
      <PopoverNotificationCenter>
        {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
      </PopoverNotificationCenter>
    </NovuProvider>
  );
}
```

## Customizing the UI

### Implementing custom bell icon

It is common that you might have a special set of icons you use within your application and you will want to replace the default: `NotificationBell` coming from our library.

For this you can easily switch the `NotificationBell` with your own bell. Just make sure you pass the `unseenCount` param inside and use it accordingly.

```tsx
<PopoverNotificationCenter>
  {({ unseenCount }) => <CustomBell unseenCount={unseenCount} />}
</PopoverNotificationCenter>
```

### Dark mode support

To support dark mode in your application the notification center component can receive a `colorScheme` prop that can receive either `dark` or `light` mode.

```tsx
<PopoverNotificationCenter colorScheme={'dark' || 'light'}>
  {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
</PopoverNotificationCenter>
```

### Popover positioning

Use `position` prop to position the popover relative to the Bell icon

```tsx
<PopoverNotificationCenter position="left-start">
  {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
</PopoverNotificationCenter>
```

### Custom UI

If you prefer to build a custom UI, it's possible to use the [useNotification](./api-reference#usenotifications) hook available in our React library.
Let's see an example on how you can do that:

```tsx
import { NovuProvider, useNotifications } from '@novu/notification-center';

function App() {
  return (
    <NovuProvider
      subscriberId={'USER_ID'}
      applicationIdentifier={'APP_ID_FROM_ADMIN_PANEL'}
      initialFetchingStrategy={{ fetchNotifications: true, fetchUserPreferences: true }}
    >
      <CustomNotificationCenter />
    </NovuProvider>
  );
}

function CustomNotificationCenter() {
  const { notifications, fetchNextPage, hasNextPage, isLoading, isFetching } = useNotifications();

  return (
    <ul>
      {notifications.map((notification) => {
        return <li>{notification.content}</li>;
      })}
    </ul>
  );
}
```

:::info

By default notifications are not fetched right away, if you would like to change this behaviour you can pass the `initialFetchingStrategy` prop to the `NovuProvider` component. The default value is `{ fetchNotifications: false }`. Read more about the [initialFetchingStrategy prop](./api-reference#novuprovider).

:::

:::tip

If you only wish to modify some parts of the existing Novu component UI, you can easily override the: Header, Footer, and NotificationItem blocks including the notification actions block.

:::

When building your custom UI implementation it might be useful to know how the notification feed model is structured, so you can customize the notification items during rendering.

The notifications array returned by the `useNotifications` hook contains an array of `IMessage` objects, its structure and properties are described in the [API reference](./api-reference#the-notification-imessage-model).

### Customize the UI language

If you want to use a language other than english for the UI, the `NovuProvider` component can accept an optional `i18n` prop.

```tsx
import {
  NovuProvider,
  PopoverNotificationCenter,
  NotificationBell,
} from '@novu/notification-center';

function Header() {
  return (
    <NovuProvider
      subscriberId={'USER_ID'}
      applicationIdentifier={'APP_ID_FROM_ADMIN_PANEL'}
      i18n="en"
    >
      <PopoverNotificationCenter>
        {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
      </PopoverNotificationCenter>
    </NovuProvider>
  );
}
```

The `i18n` prop can accept 2 different types of values

- 2 letter language string

  ```tsx
  i18n = 'en';
  ```

  <FAQ>
  <FAQItem title="Supported languages">

  - `af` (Afrikaans)
  - `am` (Amharic)
  - `ar` (Arabic)
  - `as` (Assamese)
  - `az` (Azerbaijani)
  - `ba` (Bashkir)
  - `be` (Belarusian)
  - `bg` (Bulgarian)
  - `bh` (Bihari)
  - `bn` (Bengali)
  - `bs` (Bosnian)
  - `ca` (Catalan)
  - `cs` (Czech)
  - `da` (Danish)
  - `de` (German)
  - `el` (Greek)
  - `en` (English)
  - `es` (Spanish)
  - `eu` (Basque)
  - `fa` (Farsi)
  - `fi` (Finnish)
  - `fr` (French)
  - `ga` (Irish)
  - `gl` (Galician)
  - `gu` (Gujarati)
  - `he` (Hebrew)
  - `hi` (Hindi)
  - `hr` (Croatian)
  - `hu` (Hungarian)
  - `hy` (Armenian)
  - `id` (Indonesian)
  - `ig` (Igbo)
  - `it` (Italian)
  - `ja` (Japanese)
  - `ka` (Kannada)
  - `kk` (Kazakh)
  - `km` (Khmer)
  - `ko` (Korean)
  - `ku` (Kurdish)
  - `lo` (Lao)
  - `lt` (Lithuanian)
  - `lv` (Latvian)
  - `ml` (Malayalam)
  - `mr` (Marathi)
  - `ms` (Malay)
  - `nb` (Norwegian)
  - `ne` (Nepali)
  - `nl` (Dutch)
  - `or` (Odia)
  - `pa` (Punjabi)
  - `pl` (Polish)
  - `pt` (Portuguese)
  - `ro` (Romanian)
  - `ru` (Russian)
  - `sa` (Sanskrit)
  - `sd` (Sindhi)
  - `si` (Sinhala)
  - `sm` (Samoan)
  - `sq` (Albanian)
  - `sv` (Swedish)
  - `sq` (Albanian)
  - `ta` (Tamil)
  - `te` (Telugu)
  - `th` (Thai)
  - `tl` (Tagalog)
  - `tr` (Turkish)
  - `uk` (Ukrainian)
  - `ur` (Urdu)
  - `uz` (Uzbek)
  - `vi` (Vietnamese)
  - `zh` (Chinese)
  - `zu` (Zulu)

  </FAQItem>
  </FAQ>

- Translation object

  ```tsx
  i18n={{
    // Make sure that the following is a proper language code,
    // since this is used by Intl.RelativeTimeFormat in order to calculate the relative time for each notification
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat
    lang: "de",

    translations: {
      poweredBy: "von",
      markAllAsRead: "Alles als gelesen markieren",
      notifications: "Benachrichtigungen",
      settings: "Einstellungen",
    },
  }}
  ```

:::info

Novu uses _en_ as default value for i18n

:::

## Realtime sockets

Novu provides a real-time socket API for you to consume and get updates about new notifications added to the user's feed. To use the socket connection you can use the `useSocket` hook provided by the `@novu/notification-center` library. Let's see an example of that:

```tsx
import { NovuProvider, useSocket } from '@novu/notification-center';

function App() {
  return (
    <NovuProvider subscriberId={'USER_ID'} applicationIdentifier={'APP_ID_FROM_ADMIN_PANEL'}>
      <CustomNotificationCenter />
    </NovuProvider>
  );
}

function CustomNotificationCenter() {
  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on('unseen_count_changed', (data) => {
        console.log(data.unseenCount);
      });
    }

    return () => {
      if (socket) {
        socket.off('unseen_count_changed');
      }
    };
  }, [socket]);

  return <></>;
}
```

## Notification actions

By adding action buttons on the in-app template in the editor you will need to add a matching behaviour on what happens after the user clicks on the action.

Let's look at an example:

```tsx
import {
  NovuProvider,
  useUpdateAction,
  PopoverNotificationCenter,
  NotificationBell,
} from '@novu/notification-center';

export function App() {
  return (
    <>
      <NovuProvider subscriberId={'USER_ID'} applicationIdentifier={'APP_ID_FROM_ADMIN_PANEL'}>
        <PopoverWrapper />
      </NovuProvider>
    </>
  );
}

function PopoverWrapper() {
  const { updateAction } = useUpdateAction();

  function handlerOnNotificationClick(message: IMessage) {
    if (message?.cta?.data?.url) {
      window.location.href = message.cta.data.url;
    }
  }

  async function handlerOnActionClick(
    templateIdentifier: string,
    type: ButtonTypeEnum,
    message: IMessage
  ) {
    if (templateIdentifier === 'friend-request') {
      if (type === 'primary') {
        /** Call your API to accept the friend request here **/

        /** And than update novu that this actions has been taken, so the user won't see the button again **/
        await updateAction(message._id, type, MessageActionStatusEnum.DONE);
      }
    }
  }

  return (
    <PopoverNotificationCenter
      onNotificationClick={handlerOnNotificationClick}
      onActionClick={handlerOnActionClick}
    >
      {({ unseenCount }) => {
        return <NotificationBell unseenCount={unseenCount} />;
      }}
    </PopoverNotificationCenter>
  );
}
```

Novu manages the state of the actions, so you can actually specify if the user has already performed the actions, so you can know when the actions should be hidden.

## HMAC Encryption

When Novu's user adds the notification center to their application they are required to pass a `subscriberId` which identifies the user's end-customer, and the application Identifier which is acted as a public key to communicate with the notification feed API.

A malicious actor can access the user feed by accessing the API and passing another `subscriberId` using the public application identifier.

HMAC encryption will make sure that a `subscriberId` is encrypted using the secret API key, and those will prevent malicious actors from impersonating users.

### Enabling HMAC Encryption

In order to enable Hash-Based Message Authentication Codes, you need to visit the admin panel in-app settings page and enable HMAC encryption for your environment.

Next step would be to generate an HMAC encrypted subscriberId on your backend:

```ts
import { createHmac } from 'crypto';

const hmacHash = createHmac('sha256', process.env.NOVU_API_KEY).update(subscriberId).digest('hex');
```

Then pass the created HMAC to your client side application forward it to the component:

```tsx
<NovuProvider
  subscriberId={'PLAIN_TEXT_ID'}
  subscriberHash={'HASHED_SUBSCRIBER_ID'}
  applicationIdentifier={'APP_ID_FROM_ADMIN_PANEL'}
></NovuProvider>
```

## Customizing the notification center theme

The notification center component can be customized by passing a `theme` prop to the `PopoverNotificationCenter` component. We discourage you to do styling this way, instead, it's recommended to use the `styles` property, check the details [here](../custom-styling).

A [theme](./api-reference#ithemelayout-properties) prop can be used to customize the notification center's layout, header, popover, notification list item, user preferences, footer, and unseen badge.
The object can be modified partially or completely, depending on the level of customization you want to achieve.

```tsx
const theme: INovuTheme = {
  dark: {
    // Dark Theme Props
  },
  light: {
    // Light Theme Props
  },
  common: {
    // Common
  },
};

<PopoverNotificationCenter theme={theme}>
  {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
</PopoverNotificationCenter>;
```

## Multiple tab layout

Novu allows to create a multi-tab experience for a notification center, in a way you can fetch the notifications feed using a filtered query.

### Defining a stores

To create multiple stores you can use the prop `stores` on the `NovuProvider` component. Each store has `storeId` property that will be used to interact with information related to this store.

```tsx
<NovuProvider
  stores={[
    { storeId: 'invites', query: { feedIdentifier: 'invites' } },
    { storeId: 'activity', query: { feedIdentifier: 'activity' } },
  ]}
  backendUrl={API_ROOT}
  socketUrl={WS_URL}
  subscriberId={user?._id}
  applicationIdentifier={environment?.identifier}
>
  <PopoverWrapper />
</NovuProvider>
```

Using the `query` object multiple fields can be passed for feed API:

- `feedIdentifier` - Can be configured and created on the WEB UI
- `seen` - Identifies if the notification has been seen or not

After specifying the `stores` prop, you can use the `storeId` property to interact with the store.

:::tip

By specifying only a storeId, without a query, you could get all notifications.

:::

#### Using the `useNotifications` hook

```tsx
import { useNotifications } from '@novu/core';

const { notifications } = useNotifications();
```

#### Using `tabs` prop on the notification center

```tsx
<PopoverNotificationCenter
  tabs={[
    { name: 'Invites', storeId: 'invites' },
    { name: 'Activity', storeId: 'activity' },
  ]}
  colorScheme={colorScheme}
  onNotificationClick={handlerOnNotificationClick}
  onActionClick={handlerOnActionClick}
>
  {({ unseenCount }) => {
    return <NotificationBell colorScheme={colorScheme} unseenCount={unseenCount} />;
  }}
</PopoverNotificationCenter>
```

#### Custom Notification Item component

```tsx
<PopoverNotificationCenter
  colorScheme={colorScheme}
  onNotificationClick={handlerOnNotificationClick}
  onActionClick={handlerOnActionClick}
  listItem={(notification, handleActionButtonClick, handleNotificationClick) => {
    return (
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          handleNotificationClick();
        }}
      >
        {notification.content}
      </a>
    );
  }}
>
  {({ unseenCount }) => {
    return <NotificationBell colorScheme={colorScheme} unseenCount={unseenCount} />;
  }}
</PopoverNotificationCenter>
```

## Subscriber Preferences

By default, Novu will show the subscriber preferences cog icon on the notification center component.
If you want to hide it, you can use the prop `showUserPreferences` on the `PopoverNotificationCenter` component.

![Notification Center with a cog](/img/notification-list-cog.png)

:::note
Facing issues in using notification center? Check out FAQs [here](../FAQ)
:::
