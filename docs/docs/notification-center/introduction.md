# Quick Start

Novu provides you a set of API's and components to create rich customized notification center experiences. You can either choose to work headless with our notification feed API. And create your own custom notification center user-interface, or user our ready-to-use UI and customize partially.

![Notification Center](/img/notification-center.png)

## React component

After creating your Novu Platform account and creating your first notification template it's time to connect the In-app channel to your application.

```
npm install @novu/react-notifications
```

And in the appropriate place withing your app add the `PopoverNotificationCenter` component with the `NovuProvider`

```tsx
import { NovuProvider, PopoverNotificationCenter, NotificationBell } from '@novu/react-notifications';

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

That's it! Now you're ready to send your first notifications using Novu.

## Iframe embed

If you are using an unsupported (yet) client framework, you can use our embed script, this will generate the notification center inside an iframe.
You can find the embed code in the `Settings` page within the Admin Panel. It will look similar to this:

```html
<script>
  (function(n,o,t,i,f) {
    n[i] = {}, m = ['init']; n[i]._c = [];m.forEach(me => n[i][me] = function() {n[i]._c.push([me, arguments])});
    var elt = o.createElement(f); elt.type = "text/javascript"; elt.async = true; elt.src = t;
    var before = o.getElementsByTagName(f)[0]; before.parentNode.insertBefore(elt, before);
  })(window, document, 'https://embed.novu.co/embed.umd.min.js', 'novu', 'script');

  novu.init('<REPLACE_APPLICATION_ID>', '#notification-bell', {
    $user_id: "<REPLACE_WITH_USER_UNIQUE_IDENTIFIER>",
    $email: "<REPLACE_WITH_USER_EMAIL>",
    $first_name: "<REPLACE_WITH_USER_NAME>",
    $last_name: "<REPLACE_WITH_USER_LAST_NAME>",
  });
</script>
```

Use the second init parameter to specify the element to which the embed script will attach the event listener to. For more information and customizations, checkout the embed docs for more information.
