---
sidebar_position: 4
---

# Web Component

The Notification Center Web Component is a custom element that can be used in any web application. It is built by wrapping the React components and consists from its core the three pieces: `NovuProvider`, `PopoverNotificationCenter`, and `NotificationBell` combined together into one.

## ESM module

Make sure that you have installed the `@novu/notification-center` package:

```bash
npm install @novu/notification-center
```

Then, import the web component and register it as a custom element:

```typescript
import { NotificationCenterWebComponent } from '@novu/notification-center';

customElements.define('notification-center-component', NotificationCenterWebComponent);
```

After that, you can use the web component in your HTML:

```html
<!-- HTML -->
<notification-center-component
  style="display: inline-flex"
  application-identifier="YOUR_APP_IDENTIFIER"
  subscriber-id="YOUR_SUBSCRIBER_ID"
></notification-center-component>
<script>
  // here you can attach any callbacks, interact with the Notification Center Web Component API
  let nc = document.getElementsByTagName('notification-center-component')[0];
  nc.onLoad = () => console.log('Notification Center session loaded!');
</script>
```

**Please note:** that the properties are named with a `kebab-case` in the HTML, but depending on the technology you use it might be a `camelCase`, for ex. Vue/Angular props are bound with variables using that convention.

## Bundled version (preview)

Sometimes you might not be able to use the ESM module, for example in the WordPress environment. In that case, you can use the bundled version of the Notification Center Web Component that is available on the CDN.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    ...
    <script src="https://novu-web-component.netlify.app/index.js"></script>
  </head>
  <body>
    <notification-center-component
      style="display: inline-flex"
      application-identifier="YOUR_APP_IDENTIFIER"
      subscriber-id="YOUR_SUBSCRIBER_ID"
    ></notification-center-component>
    <script>
      // here you can attach any callbacks, interact with the web component API
      let nc = document.getElementsByTagName('notification-center-component')[0];
      nc.onLoad = () => console.log('hello world!');
    </script>
  </body>
</html>
```

## Properties

The Notification Center Web Component has a few properties that you can use to customize the behavior of the component. The only required property is `applicationIdentifier`.

If you are using TypeScript, then you might want to check the `NotificationCenterComponentProps` interface.

| Prop                         | Type       | Description                                                                                                                                                                                                                                                                                                            |
| ---------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backendUrl`                 | `string`   | Custom API location in case of self-hosted version of Novu.                                                                                                                                                                                                                                                            |
| `socketUrl`                  | `string`   | Custom WebSocket Service location in case of self-hosted version of Novu.                                                                                                                                                                                                                                              |
| `subscriberId`               | `string`   | The subscriberId is a custom identifier used when identifying your users within the Novu platform.                                                                                                                                                                                                                     |
| `applicationIdentifier`      | `string`   | Is a public identifier used to identify your application, can be found in the Novu Admin panel.                                                                                                                                                                                                                        |
| `subscriberHash`             | `string`   | The hashed subscriber id, more info [here](./react/react-components/#enabling-hmac-encryption).                                                                                                                                                                                                                        |
| `stores`                     | `object[]` | The array of the store items that are bound with the feed, it's used together with `tabs` property if you would like to have separate feeds in the notification center. More information can be found [here](./react/react-components/#multiple-tab-layout).                                                           |
| `tabs`                       | `object[]` | The array of items that do describe the tabs/feeds, they are bound with the `stores` property. More information can be found [here](./react/react-components/#multiple-tab-layout).                                                                                                                                    |
| `showUserPreferences`        | `boolean`  | The flag indicating whether the user preference settings should be visible or not.                                                                                                                                                                                                                                     |
| `allowedNotificationActions` | `boolean`  | The flag indicating whether to show/hide the dots menu for actions performed on a notification.                                                                                                                                                                                                                        |
| `popover`                    | `object`   | The object defining how the popover should be positioned. It's properties are position and offset.                                                                                                                                                                                                                     |
| `theme`                      | `object`   | The object defining the the light/dark styles of the Notification Center component, more info [here](./react/react-components#customizing-the-notification-center-theme). We discourage you to use this prop to do the styling, instead it's recommended to use the `styles` property.                                 |
| `styles`                     | `object`   | The object allows you to define the custom CSS code. Check the details [here](./custom-styling).                                                                                                                                                                                                                       |
| `colorScheme`                | `string`   | The prop defining which color version of the styles the component should set. The options are `light` and `dark`.                                                                                                                                                                                                      |
| `i18n`                       | `object`   | The object allowing to customize the UI language, more details [here](./react/react-components/#customize-the-ui-language).                                                                                                                                                                                            |
| `onLoad`                     | `function` | The callback function that is called when the session is successfully initiated. It receives the first argument object with the `organization` property. There is a sibling property `sessionLoaded` that might be used in the environments that do not allow to use properties with the prefix `on`, like in Angular. |
| `onNotificationClick`        | `function` | The callback function that is called when the user has clicked on the notification. The first argument it receives is the notification object. There is a sibling property `notificationClicked`.                                                                                                                      |
| `onUnseenCountChanged`       | `function` | The callback function that is called when the unseen notifications count changes. The first argument it receives is the number of unseen notifications count. There is a sibling property `unseenCountChanged`.                                                                                                        |
| `onActionClick`              | `function` | The callback function that is called when user clicks on one of the notification buttons (primary/secondary). The arguments it receives are: template identifier, button type, and notification object. There is a sibling property `actionClicked`.                                                                   |
| `onTabClick`                 | `function` | The callback function that is called when user clicks on the feed tab. The first arguments it receives is the tab object. There is a sibling property `tabClicked`.                                                                                                                                                    |

## Limitations

It's important to note that there are some limitations when using the Web Component compared to the React version:

- you get all in one component
- it doesn't support the `children, header, footer, emptyState, listItem` props
- it's a wrapped react component, which means a bigger bundle size (we are working on it to make it smaller)

:::note
Facing issues in using notification center? Check out FAQs [here](./FAQ)
:::
