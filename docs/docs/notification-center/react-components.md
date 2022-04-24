# React Component

Novu provides the `@novu/notification-center` a react library that helps to add a fully functioning notification center  to your web application in minutes. Let's do a quick recap on how we can easily use it in your application:

```
npm install @novu/notification-center
```

```tsx
import { NovuProvider, PopoverNotificationCenter, NotificationBell } from '@novu/notification-center';

function Header() {
  return (
    <NovuProvider subscriberId={'USER_ID'} applicationIdentifier={'APP_ID_FROM_ADMIN_PANEL'}>
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
<NovuProvider subscriberId={'USER_ID'} colorScheme={'dark' || 'light'}>
  <PopoverNotificationCenter>
    {({ unseenCount }) => <NotificationBell unseenCount={unseenCount} />}
  </PopoverNotificationCenter>
</NovuProvider>
```
