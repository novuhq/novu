---
sidebar_position: 4
---

# Vue Component

The `@novu/notification-center-vue` package provides a Vue component wrapper over the Notification Center Web Component that you can use to integrate the notification center into your Vue application.

## Installation

```bash
npm install @novu/notification-center-vue
```

## Example usage

```html
<script lang="ts">
  import { NotificationCenterComponent } from '@novu/notification-center-vue';

  export default {
    components: {
      NotificationCenterComponent,
    },
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

## Props

The `NotificationCenterComponent` accepts the same set of props as the [Web Component](./web-component#properties).
