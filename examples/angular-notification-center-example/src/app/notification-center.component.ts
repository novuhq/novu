import { Component, Input } from '@angular/core';
import '@novu/notification-center';

@Component({
  selector: 'notification-center',
  template: `
    <notification-center-component
      [backendUrl]="backendUrl"
      [socketUrl]="socketUrl"
      [subscriberId]="subscriberId"
      [applicationIdentifier]="applicationIdentifier"
    >
    </notification-center-component>
  `,
})
export class NotificationCenter {
  @Input() backendUrl: string | undefined;
  @Input() socketUrl: string | undefined;
  @Input() subscriberId: string | undefined;
  @Input() applicationIdentifier: string | undefined;
  asd = { asd: 123 };
}
