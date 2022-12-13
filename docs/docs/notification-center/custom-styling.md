---
sidebar_position: 6
---

# Custom styling

The Notification Center Component allows you to customize the look of the component. You can do that by using the `styles` property, but depending on the wrapper UI library we support, the styles prop will be applied to different components, check the [examples](#example-usage).

## Styles interface

The `styles` property accepts an object with the following interface:

```typescript
interface NotificationCenterStyles {
  bellButton?: ObjectWithRoot<{
    dot?: CSSFunctionOrObject;
  }>;
  unseenBadge?: CSSFunctionOrObject;
  popover?: {
    arrow?: CSSFunctionOrObject;
    dropdown?: CSSFunctionOrObject;
  };
  loader?: ObjectWithRoot;
  layout?: ObjectWithRoot;
  header?: ObjectWithRoot<{
    title?: CSSFunctionOrObject;
    markAsRead?: CSSFunctionOrObject;
    cog?: CSSFunctionOrObject;
    backButton?: CSSFunctionOrObject;
  }>;
  tabs?: {
    tabsList?: CSSFunctionOrObject;
    tab?: CSSFunctionOrObject;
    tabLabel?: CSSFunctionOrObject;
    tabIcon?: CSSFunctionOrObject;
  };
  accordion?: {
    item?: CSSFunctionOrObject;
    content?: CSSFunctionOrObject;
    control?: CSSFunctionOrObject;
    chevron?: CSSFunctionOrObject;
  };
  switch?: ObjectWithRoot<{
    input?: CSSFunctionOrObject;
    track?: CSSFunctionOrObject;
    thumb?: CSSFunctionOrObject;
  }>;
  footer?: ObjectWithRoot<{
    title?: CSSFunctionOrObject;
  }>;
  notifications?: ObjectWithRoot<{
    listItem?: {
      read?: CSSFunctionOrObject;
      unread?: CSSFunctionOrObject;
      layout?: CSSFunctionOrObject;
      contentLayout?: CSSFunctionOrObject;
      title?: CSSFunctionOrObject;
      timestamp?: CSSFunctionOrObject;
      buttons?: ObjectWithRoot<{
        primary?: CSSFunctionOrObject;
        secondary?: CSSFunctionOrObject;
      }>;
    };
  }>;
  preferences?: ObjectWithRoot<{
    item?: {
      title?: CSSFunctionOrObject;
      channels?: CSSFunctionOrObject;
      divider?: CSSFunctionOrObject;
      content?: {
        icon?: CSSFunctionOrObject;
        channelLabel?: CSSFunctionOrObject;
        success?: CSSFunctionOrObject;
      };
    };
  }>;
}

type CSSFunctionInterpolation = (args: {
  theme: INovuTheme;
  common: ICommonTheme;
  colorScheme: ColorScheme;
}) => CSSInterpolation;

type CSSFunctionOrObject = CSSFunctionInterpolation | CSSInterpolation;

type ObjectWithRoot<T = {}> = T & {
  root: CSSFunctionOrObject;
};
```

The `CSSInterpolation` is the object type from the `@emotion/css` package, you can find more details about it [here](https://emotion.sh/docs/@emotion/css#object-styles).

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

To learn more about the `INovuTheme` and `ICommonTheme` interfaces, check the [theming](./react-components/#customizing-the-notification-center-theme) page.

## Example usage

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

```tsx
<NovuProvider
  styles={{
    header: {
      root: { backgroundColor: 'red' },
    }
  }}
>...
```

### Vue component

```html
<script lang="ts">
  import { NotificationCenterComponent } from '@novu/notification-center-vue';

  export default {
    components: {
      NotificationCenterComponent,
    },
    data() {
      return {
        styles: {
          header: {
            root: { backgroundColor: 'red' },
          },
        },
      };
    },
  };
</script>

<template>
  <NotificationCenterComponent :styles="styles" ... />
</template>
```

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
