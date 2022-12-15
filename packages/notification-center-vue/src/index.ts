import type { App } from 'vue';
import FloatingVue from 'floating-vue';
import 'floating-vue/dist/style.css';

import { NotificationCenterComponent } from './lib';

export { NotificationCenterComponent } from './lib';

export default {
  install(app: App) {
    app.use(FloatingVue, {
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
