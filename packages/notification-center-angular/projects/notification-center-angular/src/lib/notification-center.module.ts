import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { NotificationCenterComponent } from './notification-center.component';

@NgModule({
  declarations: [NotificationCenterComponent],
  exports: [NotificationCenterComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class NotificationCenterModule {}
