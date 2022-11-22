import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, NgZone } from '@angular/core';
import { ProxyCmp } from './angular-component-lib/utils';

import '@novu/notification-center';

// eslint-disable-next-line
// export declare interface NotificationCenterComponent extends NotificationCenterComponentProps {}

@ProxyCmp({
  inputs: [
    'stores',
    'backendUrl',
    'socketUrl',
    'subscriberId',
    'applicationIdentifier',
    'onLoad',
    'subscriberHash',
    'i18n',
    'colorScheme',
  ],
})
@Component({
  selector: 'notification-center-component',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content></ng-content>',
  inputs: [
    'stores',
    'backendUrl',
    'socketUrl',
    'subscriberId',
    'applicationIdentifier',
    'onLoad',
    'subscriberHash',
    'i18n',
    'colorScheme',
  ],
})
export class NotificationCenterComponent {
  protected el: HTMLElement;
  constructor(changeDetector: ChangeDetectorRef, elRef: ElementRef, protected z: NgZone) {
    changeDetector.detach();
    this.el = elRef.nativeElement;
  }
}
