import { Component, Input } from '@angular/core';
import { NotificationCenterWebComponent, NotificationCenterComponentProps } from '@novu/notification-center';

customElements.define('notification-center-web-component', NotificationCenterWebComponent);

@Component({
  selector: 'notification-center-component',
  template: `<notification-center-web-component
    [backendUrl]="backendUrl"
    [socketUrl]="socketUrl"
    [subscriberId]="subscriberId"
    [applicationIdentifier]="applicationIdentifier"
    [subscriberHash]="subscriberHash"
    [stores]="stores"
    [tabs]="tabs"
    [showUserPreferences]="showUserPreferences"
    [allowedNotificationActions]="allowedNotificationActions"
    [popover]="popover"
    [popoverConfig]="popoverConfig"
    [theme]="theme"
    [styles]="styles"
    [colorScheme]="colorScheme"
    [i18n]="i18n"
    [sessionLoaded]="sessionLoaded"
    [notificationClicked]="notificationClicked"
    [unseenCountChanged]="unseenCountChanged"
    [actionClicked]="actionClicked"
    [tabClicked]="tabClicked"
    [preferenceFilter]="preferenceFilter"
  ></notification-center-web-component>`,
  inputs: [
    'backendUrl',
    'socketUrl',
    'subscriberId',
    'applicationIdentifier',
    'subscriberHash',
    'stores',
    'tabs',
    'showUserPreferences',
    'allowedNotificationActions',
    'popover',
    'popoverConfig',
    'theme',
    'styles',
    'colorScheme',
    'i18n',
    'sessionLoaded',
    'notificationClicked',
    'unseenCountChanged',
    'actionClicked',
    'tabClicked',
    'preferenceFilter',
  ],
})
export class NotificationCenterComponent {
  @Input() backendUrl: NotificationCenterComponentProps['backendUrl'];
  @Input() socketUrl: NotificationCenterComponentProps['socketUrl'];
  @Input() subscriberId: NotificationCenterComponentProps['subscriberId'];
  @Input() applicationIdentifier: NotificationCenterComponentProps['applicationIdentifier'] = '';
  @Input() subscriberHash: NotificationCenterComponentProps['subscriberHash'];
  @Input() stores: NotificationCenterComponentProps['stores'];
  @Input() tabs: NotificationCenterComponentProps['tabs'];
  @Input() showUserPreferences: NotificationCenterComponentProps['showUserPreferences'];
  @Input() allowedNotificationActions: NotificationCenterComponentProps['allowedNotificationActions'];
  /**
   * @deprecated Use popoverConfig instead
   */
  @Input() popover: NotificationCenterComponentProps['popover'];
  @Input() popoverConfig: NotificationCenterComponentProps['popoverConfig'];
  @Input() theme: NotificationCenterComponentProps['theme'];
  @Input() styles: NotificationCenterComponentProps['styles'];
  @Input() colorScheme?: NotificationCenterComponentProps['colorScheme'];
  @Input() i18n: NotificationCenterComponentProps['i18n'];
  @Input() sessionLoaded: NotificationCenterComponentProps['sessionLoaded'];
  @Input() notificationClicked?: NotificationCenterComponentProps['notificationClicked'];
  @Input() unseenCountChanged: NotificationCenterComponentProps['unseenCountChanged'];
  @Input() actionClicked: NotificationCenterComponentProps['actionClicked'];
  @Input() tabClicked: NotificationCenterComponentProps['tabClicked'];
  @Input() preferenceFilter: NotificationCenterComponentProps['preferenceFilter'];
}
