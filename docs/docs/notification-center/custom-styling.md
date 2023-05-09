---
sidebar_position: 8
---

import ReactCustomStyling from "@site/src/components/NotificationCenter/CustomStyling/React"
import VueCustomStyling from "@site/src/components/NotificationCenter/CustomStyling/Vue"

# Custom styling

The Notification Center Component allows you to customize the look of the component. You can do that by using the `styles` property, but depending on the wrapper UI library we support, the styles prop will be applied to different components, check the [examples](#example-usage). The styles object interface and all the props can be found [here](./react/api-reference#styles-interface).

The styles object can be defined like this:

```typescript
const styles = {
  header: {
    root: {
      backgroundColor: 'white',
      '&:hover': { backgroundColor: 'pink' },
      '.some_class': { color: 'red' },
    },
    title: ({
      theme, // INovuTheme;
      common, // ICommonTheme;
      colorScheme, // ColorScheme;
    }) => ({ color: colorScheme === 'light' ? 'black' : 'white' }),
  },
  ...
};
```

## Example usage

### iframe

```html
<script>
  novu.init(
    '<REPLACE_APPLICATION_ID>',
    {
      unseenBadgeSelector: '#unseen-badge',
      bellSelector: '#notification-bell',
      // add your custom style here
      styles: {
        header: {
          root: { backgroundColor: 'red' },
          title: {
            color: 'blue',
          },
        },
      },
    },
    {
      subscriberId: '<REPLACE_WITH_USER_UNIQUE_IDENTIFIER>',
    }
  );
</script>
```

### Web component

```html
<!-- HTML -->
<notification-center-component ...></notification-center-component>
<script>
  // here you can attach any callbacks, interact with the Notification Center Web Component API
  let nc = document.getElementsByTagName('notification-center-component')[0];
  nc.styles = {
    header: {
      root: { backgroundColor: 'red' },
    },
  };
</script>
```

### React component

<ReactCustomStyling />

### Vue component

<VueCustomStyling />

### Angular component

```html
<notification-center-component [styles]="styles" ...></notification-center-component>
```

```javascript
@Component({
  selector: '...',
  templateUrl: './component.html',
})
export class AppComponent {
  styles = {
    header: {
      root: { backgroundColor: 'red' },
    },
  };
}
```

:::note
Facing issues in using notification center? Check out FAQs [here](./FAQ)
:::
