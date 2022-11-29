# iFrame Embed

If you are using a (currently) unsupported client framework, you can use our embedded script. This will generate the notification center inside an iframe.
You can find the embedded code in the `Settings` page, within the Admin Panel. It will look similar to this:

<!-- prettier-ignore-start -->
```html
<script>
  (function(n,o,t,i,f) {
    n[i] = {}; var m = ['init', 'on']; n[i]._c = [];m.forEach(me => n[i][me] = function() {n[i]._c.push([me, arguments])});
    var elt = o.createElement(f); elt.type = "text/javascript"; elt.async = true; elt.src = t;
    var before = o.getElementsByTagName(f)[0]; before.parentNode.insertBefore(elt, before);
  })(window, document, 'https://embed.novu.co/embed.umd.min.js', 'novu', 'script');

  novu.init(
    '<REPLACE_APPLICATION_ID>',
    {
      unseenBadgeSelector: '#unseen-badge',
      bellSelector: '#notification-bell',
    },
    {
      subscriberId: '<REPLACE_WITH_USER_UNIQUE_IDENTIFIER>',
      email: '<REPLACE_WITH_USER_EMAIL>',
      first_name: '<REPLACE_WITH_USER_NAME>',
      last_name: '<REPLACE_WITH_USER_LAST_NAME>',
    }
  );
</script>
```
<!-- prettier-ignore-end -->

Replace the selectors for the bell icon and the unseen badge within your code. Let's take a look at this example code:

```html
<nav>
  <div id="notification-bell">
    <i class="fa fa-bell"></i>
    <span id="unseen-badge"></span>
  </div>
</nav>
```

## Customizing the dropdown position

Optionally, the embedded init script receives a position object, you can use this to specify the `left` and `top` position of the notification center.

```html
<script>
  novu.init(
    '<REPLACE_APPLICATION_ID>',
    {
      unseenBadgeSelector: '#unseen-badge',
      bellSelector: '#notification-bell',
      position: {
        top: '50px',
        left: '100px',
      },
    },
    {
      ...subscriberProps,
    }
  );
</script>
```

## Customizing the theme

The notification center component can be customized by passing a `theme` to the init script.
More information on all possible theme properties can be found [here](/notification-center/react-components#customizing-the-notification-center-theme).

```html
<script>
  const customTheme = {
    light: {
      layout: {
        background: 'red',
      },
    },
  };

  novu.init(
    '<REPLACE_APPLICATION_ID>',
    {
      unseenBadgeSelector: '#unseen-badge',
      bellSelector: '#notification-bell',
      theme: customTheme,
    },
    {
      ...subscriberProps,
    }
  );
</script>
```

## Customizing the UI language

The language of the UI can be customized by passing an `i18n` component to the init script.
More information on all possible properties for it can be found [here](/notification-center/react-components#customize-the-ui-language).

```html
<script>
  const customLanguage = {
    lang: 'en',
    translations: {
      notifications: 'My custom notifications!',
    },
  };

  novu.init(
    '<REPLACE_APPLICATION_ID>',
    {
      unseenBadgeSelector: '#unseen-badge',
      bellSelector: '#notification-bell',
      i18n: customLanguage,
    },
    {
      ...subscriberProps,
    }
  );
</script>
```

## Handle User Interaction

In order to handle certain events like the user clicking on the notification, or clicking on an action button inside a notification, you can listen for these events and handle them accordingly.

```ts
novu.on('notification_click', (notification) => {
  // do custom logic here
});

novu.on('action_click', ({ templateIdentifier, type, notification }) => {
  // do custom logic here
});
```

## Enabling HMAC Encryption

In order to enable Hash-Based Message Authentication Codes, you need to visit the admin panel's in-app settings page and enable HMAC encryption for your environment.

The next step would be to generate an HMAC encrypted subscriberId on your backend:

```ts
import { createHmac } from 'crypto';

const hmacHash = createHmac('sha256', process.env.NOVU_API_KEY).update(subscriberId).digest('hex');
```

Then pass the created HMAC to your client side application forward it to the embed initialization script:

```ts
novu.init(
  '<REPLACE_APPLICATION_ID>',
  {
    unseenBadgeSelector: '#unseen-badge',
    bellSelector: '#notification-bell',
    position: {
      top: '50px',
      left: '100px',
    },
  },
  {
    subscriberId: 'REPLACE_WITH_PLAIN_VALUE',
    subscriberHash: 'REPLACE_WITH_HASHED_VALUE',
  }
);
```

## Embed options parameters

The second parameter of `novu.init` can be used to specify the options for the embed script. Here is a list of all the available options:

| Parameter             | Type                 | Description                                                                                                          |
| --------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `bellSelector`        | `string`             | A `class` or `id` of the notification bell in your UI. We will attach an event listener for it.                      |
| `unseenBadgeSelector` | `string`             | A selector to the unseen count badge (the red dot) which Novu can use to populate in case unseen notifications exist |
| `backendUrl`          | `string`             | Custom API location in case of self-hosted version of Novu                                                           |
| `socketUrl`           | `string`             | Custom WebSocket Service location in case of self-hosted version of Novu                                             |
| `position.top`        | `string` \| `number` | Override the top position of the notification center drop down                                                       |
| `position.left`       | `string` \| `number` | Override the left position of the notification center drop down                                                      |
| `theme`               | `object`             | Provide a custom theme for the notification center to use (for example see [above](#customizing-the-theme))          |
