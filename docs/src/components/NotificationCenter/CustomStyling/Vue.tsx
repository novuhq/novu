/* eslint-disable @typescript-eslint/naming-convention */
import SandPack from '../../SandPack/SandPack';
import React from 'react';
import { customStyleCode } from './shared';

const files = {
  '/src/styles.ts': {
    code: customStyleCode,
    active: true,
  },
  '/src/App.vue': `<script lang="ts">
import { styles } from "./styles.ts";
export default {
  data() {
    return {
      applicationIdentifier: "YOUR_APPLICATION_IDENTIFIER",
      subscriberId: "YOUR_SUBSCRIBER_ID",
      styles: styles,
      colorScheme: "light",
    };
  },
  methods: {
    sessionLoaded() {
      console.log("Notification Center Session Loaded!");
    },
  },
};
</script>

<template>
  <div style="display: flex; flex-direction: column; align-items: center">
    <p style="width: 80%; text-align: center; font-size: 12px">
      Change <b>subscriberId</b> and <b>applicationIdentifier</b> variables in
      <b>App.vue</b> file with valid values to remove loader.
    </p>
    <NotificationCenterComponent
      :subscriberId="subscriberId"
      :applicationIdentifier="applicationIdentifier"
      :sessionLoaded="sessionLoaded"
      :styles="styles"
      :colorScheme="colorScheme"
    />
  </div>
</template>`,
  '/src/main.ts': `import { createApp } from "vue";
import NotificationCenterPlugin from "@novu/notification-center-vue";
import "@novu/notification-center-vue/dist/style.css";
import App from "./App.vue";

createApp(App).use(NotificationCenterPlugin).mount("#app");`,
};

const VueCustomStyling = () => {
  return <SandPack theme={'dark'} template="vue-ts" files={files} />;
};

export default VueCustomStyling;
