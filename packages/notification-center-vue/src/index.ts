import type { App } from 'vue';
import FloatingVue from 'floating-vue';
import 'floating-vue/dist/style.css';

import { NotificationCenterComponent } from './lib';

export { NotificationCenterComponent } from './lib';

const ONE_DAY = 24 * 60 * 60 * 1000;

export default {
  install(app: App) {
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
