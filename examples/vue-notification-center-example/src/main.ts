import { createApp } from 'vue-demi';
import NotificationCenterPlugin from '@novu/notification-center-vue';
import '@novu/notification-center-vue/dist/style.css';

import App from './App.vue';

import './assets/main.css';

createApp(App).use(NotificationCenterPlugin).mount('#app');
