import type { App } from 'vue';
import FloatingVue from '@novu/floating-vue';
import '@novu/floating-vue/dist/style.css';
import { NotificationCenterContentWebComponent } from '@novu/notification-center';

import { NotificationCenterComponent } from './lib';

export { NotificationCenterComponent } from './lib';

const ONE_DAY = 24 * 60 * 60 * 1000;

export default {
  install(app: App) {
    customElements.define('notification-center-content-component', NotificationCenterContentWebComponent);

    app.use(FloatingVue, {
      disposeTimeout: ONE_DAY,
      themes: {
        dark: {
          $extend: 'dropdown',
          distance: 10,
        },
        light: {
          $extend: 'dropdown',
          distance: 10,
        },
      },
    });

    app.component('NotificationCenterComponent', NotificationCenterComponent);
  },
};
