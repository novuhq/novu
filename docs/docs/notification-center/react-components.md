# React Component

Novu provides the `@novu/notification-center` a react library that helps to add a fully functioning notification center  to your web application in minutes. Let's do a quick recap on how we can easily use it in your application:

```bash
npm install @novu/notification-center
```

```tsx
import { NovuProvider, PopoverNotificationCenter, NotificationBell, IMessage } from '@novu/notification-center';

function Header() {
  function onNotificationClick(notification: IMessage) {
    navigate(notification.cta.data.url);
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

## Use your own backend and socket url

By default, Novu's hosted services of api and socket are used. Should you want, you could override them and configure your own.

```tsx
import { NovuProvider, PopoverNotificationCenter, NotificationBell } from '@novu/notification-center';

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

## Implementing custom bell icon

It is common that you might have a special set of icons you use within your application and you will want to replace the default: `NotificationBell` coming from our library.

For this you can easily switch the `NotificationBell` with your own bell. Just make sure you pass the `unseenCount` param inside and use it accordingly.

```tsx
  <PopoverNotificationCenter>
    {({ unseenCount }) => <CustomBell unseenCount={unseenCount} />}
  </PopoverNotificationCenter>
```

## Dark mode support

To support dark mode in your application the notification center component can receive a `colorScheme` prop that can receive either `dark` or `light` mode.

```tsx
  <PopoverNotificationCenter colorScheme={'dark' || 'light'}>
    {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
  </PopoverNotificationCenter>
```

## Custom UI

If you prefer to build a custom UI, it's possible to use the `useNotification` hook available in our react library.
Let's see and example on how you can do that:

```tsx
import { NovuProvider, useNotifications } from '@novu/notification-center';

function App() {
  return (
    <NovuProvider subscriberId={'USER_ID'} applicationIdentifier={'APP_ID_FROM_ADMIN_PANEL'}>
      <CustomNotificationCenter />
    </NovuProvider>
  );
}

function CustomNotificationCenter() {
  const { 
    notifications,
    fetchNextPage,
    hasNextPage,
    fetching,
    markAsSeen,
    refetch
  } = useNotifications();
  
  return (
    <ul>
      {notifications.map((notification) => {
        return (
          <li>
            {notification.content}
          </li>
        )
      })}
    </ul>
  );
}
```

## Realtime sockets

Novu provides a real-time socket API for you to consume to get updates about new notifications added to the user's feed. To use the socket connection you can use the `useSocket` hook provided by the `@novu/notification-center` library. Let's see and example of that:

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

## HMAC Encryption

When Novu's user adds the notification center to their application they are required to pass a `subscriberId` which identifies the user's end-customer, and the application Identifier which is acted as a public key to communicate with the notification feed API.

A malicious actor can access the user feed by accessing the API and passing another `subscriberId` using the public application identifier.

HMAC encryption will make sure that a `subscriberId` is encrypted using the secret API key, and those will prevent malicious actors from impersonating users.

### Enabling HMAC Encryption

In order to enable Hash-Based Message Authentication Codes, you need to visit the admin panel in-app settings page and enable HMAC encryption for your environment.

Next step would be to generate an HMAC encrypted subscriberId on your backend:

```ts
import { createHmac } from 'crypto';

const hmacHash = createHmac('sha256', process.env.NOVU_API_KEY)
  .update(subscriberId)
  .digest('hex');
```

Then pass the created HMAC to your client side application forward it to the component:

```tsx
<NovuProvider subscriberId={'PLAIN_TEXT_ID'} subscriberHash={'HASHED_SUBSCRIBER_ID'} applicationIdentifier={'APP_ID'}>
</NovuProvider>
```

## Customizing the notification center theme

The notification center component can be customized by passing a `theme` prop to the `PopoverNotificationCenter` component.

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
   }
};

<PopoverNotificationCenter theme={theme}>
  {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
</PopoverNotificationCenter>

export interface INovuTheme {
  layout?: IThemeLayout;
  header?: IThemeHeader;
  popover?: IThemePopover;
  notificationItem?: IThemeNotificationListItem;
  footer?: IThemeFooter;
  loaderColor?: string;
  unseenBadge?: IThemeUnseenBadge;
}

```

A theme object can be used to customize the notification center's layout, header, popover, notification list item, footer, and unseen badge. 
The object can be modified partially or completely, depending on the level of customization you want to achieve.

Here are the optional fields that can be used to customize the notification center:

A table of IThemeLayout properties:

## Default styles for `IThemeLayout`

| Property | Default Value - Light Theme              | Default Value - Dark Theme |
| -------- |------------------------------------------|----------------------------|
| `background` | `#FFFFFF`                                | `#1E1E26`                                |  
| `boxShadow` | `0px 5px 15px rgba(122, 133, 153, 0.25)` | `0px 5px 20px rgba(0, 0, 0, 0.2)` |
| `borderRadius` | `7px`                                     |`7px`                                         |
| `wrapper.secondaryFontColor` | `#BEBECC`                                | `#525266`                               |

```tsx
export interface IThemeLayout {
  background?: string;
  boxShadow?: string;
  borderRadius?: string;
  wrapper?: {
    secondaryFontColor?: string;
  };
}
```
## Default styles for `IThemeHeader`

| Property | Default Value - Light Theme              | Default Value - Dark Theme |
| -------- |------------------------------------------|----------------------------|
| `badgeColor` | `linear-gradient(0deg,#FF512F 0%,#DD2476 100%)`                                | `linear-gradient(0deg,#FF512F 0%,#DD2476 100%)`                                |  
| `badgeTextColor` | `#FFFFFF` | `#FFFFFF` |
| `fontColor` | `#828299`                                     |`#FFFFFF`                                         |

```tsx
export interface IThemeHeader {
  badgeColor?: string;
  badgeTextColor?: string;
  fontColor?: string;
}
```
## Default styles for `IThemePopover`

| Property | Default Value - Light Theme              | Default Value - Dark Theme |
| -------- |------------------------------------------|----------------------------|
| `arrowColor` | `#FFFFFF`                                | `#1E1E26`                                |  

```tsx
export interface IThemePopover {
  arrowColor?: string;
}
```
## Default styles for `IThemeNotificationListItem`

| Property                 | Default Value - Light Theme              | Default Value - Dark Theme |
|--------------------------|------------------------------------------|----------------------------|
| `seen.fontColor`         | `#828299`                                | `#FFFFFF`                               |  
| `seen.background`        | `#F5F8FA`                                | `#23232B`                                |  
| `seen.timeMarkFontColor` | `#BEBECC` | `#525266` |
| `unseen.fontColor`       | `#828299`                                     |`#FFFFFF`                                        |
| `unseen.background`      | `#FFFFFF`                                | `#292933`                              |
| `unseen.boxShadow`      | `0px 5px 15px rgba(122, 133, 153, 0.25)`                                | `0px 5px 20px rgba(0, 0, 0, 0.2)`                              |
| `unseen.notificationItemBeforeBrandColor`| `linear-gradient(0deg,#FF512F 0%,#DD2476 100%)`                                | `linear-gradient(0deg,#FF512F 0%,#DD2476 100%)`                              |
| `unseen.timeMarkFontColor`      | `#828299`                                | `#828299`                              |

```tsx
export interface IThemeNotificationListItem {
  seen?: {
    fontColor?: string;
    background?: string;
    timeMarkFontColor?: string;
  };
  unseen?: {
    fontColor?: string;
    background?: string;
    boxShadow?: string;
    notificationItemBeforeBrandColor?: string;
    timeMarkFontColor?: string;
  };
}
```
## Default styles for `IThemeFooter`

| Property | Default Value - Light Theme              | Default Value - Dark Theme |
| -------- |------------------------------------------|----------------------------|
| `logoTextColor` | `#000000`                                | `#FFFFFF`                                |  
| `logoPrefixFontColor` | `#A1A1B2`                                | `#525266`                                |  

```tsx
export interface IThemeFooter {
  logoTextColor?: string;
  logoPrefixFontColor?: string;
}
```
## Default styles for `IThemeUnseenBadge`

| Property          | Default Value - Light Theme                | Default Value - Dark Theme |
|-------------------|--------------------------------------------|----------------------------|
| `color.fillColor` | `stopColor: #FF512F stopColorOffset: #DD2476` | `stopColor: #FF512F stopColorOffset: #DD2476`                                |  
| `color.borderColor`          | `#FFFFFF`                                   | `#1E1E26`                               |  

```tsx
export interface IThemeUnseenBadge {
  color?: {
    fillColor?: string | ISvgStopColor;
    borderColor?: string;
  };
}
```

