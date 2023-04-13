---
sidebar_position: 5
---

# Vue Component

The `@novu/notification-center-vue` package provides a Vue component wrapper over the Notification Center Web Component that you can use to integrate the notification center into your Vue application.

## Installation

```bash
npm install @novu/notification-center-vue
```

:::note
Novu supports only Vue 3.
:::

## The plugin

The Notification Center Vue plugin can be used to register the `NotificationCenterComponent` as a global component. This is the recommended way to use the component.

```js
import { createApp } from 'vue';
import NotificationCenterPlugin from '@novu/notification-center-vue';
import '@novu/notification-center-vue/dist/style.css';
// your app component
import App from './App.vue';

createApp(App).use(NotificationCenterPlugin).mount('#app');
```

## Example usage

```html
<script lang="ts">
  export default {
    data() {
      return {
        applicationIdentifier: import.meta.env.VITE_NOVU_APP_IDENTIFIER,
        subscriberId: import.meta.env.VITE_NOVU_SUBSCRIBER_ID,
      };
    },
    methods: {
      sessionLoaded() {
        console.log('Notification Center Session Loaded!');
      },
    },
  };
</script>

<template>
  <NotificationCenterComponent
    :subscriberId="subscriberId"
    :applicationIdentifier="applicationIdentifier"
    :sessionLoaded="sessionLoaded"
  />
</template>
```

By default the `NotificationCenterComponent` renders the default bell button that opens the notification center when clicked, but it can be customized.

## Example usage with a custom bell button

You can pass the custom bell button component as the default slot to the `NotificationCenterComponent` and it will be used to open the notification center.
The `NotificationCenterComponent` also accepts a scoped slot which exposes the `unseenCount` property - the number of unseen notifications count.

```html
<script lang="ts">
  export default {
    data() {
      return {
        applicationIdentifier: import.meta.env.VITE_NOVU_APP_IDENTIFIER,
        subscriberId: import.meta.env.VITE_NOVU_SUBSCRIBER_ID,
      };
    },
    methods: {
      sessionLoaded() {
        console.log('Notification Center Session Loaded!');
      },
    },
  };
</script>

<template>
  <NotificationCenterComponent
    :subscriberId="subscriberId"
    :applicationIdentifier="applicationIdentifier"
    :sessionLoaded="sessionLoaded"
    v-slot="slot"
  >
    <button>Notifications: {{ slot.unseenCount }}</button>
  </NotificationCenterComponent>
</template>
```

## Props

The `NotificationCenterComponent` accepts the same set of props as the [Web Component](./web-component#properties).

:::note
Facing issues in using notification center? Check out FAQs [here](./FAQ)
:::
