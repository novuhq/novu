// eslint-disable-next-line
// @ts-ignore
import * as Vue from 'vue';
import {
  NotificationCenterWebComponent,
  NotificationCenterComponentProps,
  NOTIFICATION_CENTER_PROPS,
} from '@novu/notification-center';

import { defineContainer } from './vue-component-lib/utils';

customElements.define('notification-center-component', NotificationCenterWebComponent);

// eslint-disable-next-line @typescript-eslint/naming-convention
export const NotificationCenterComponent = defineContainer<NotificationCenterComponentProps>(
  'notification-center-component',
  undefined,
  NOTIFICATION_CENTER_PROPS
);
