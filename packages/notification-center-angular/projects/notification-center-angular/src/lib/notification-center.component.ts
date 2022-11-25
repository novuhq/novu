import { Component, Input } from '@angular/core';
import { NotificationCenterWebComponent, NotificationCenterComponentProps } from '@novu/notification-center';

customElements.define('notification-center-component', NotificationCenterWebComponent);

@Component({
  selector: 'notification-center',
  template: `<notification-center-component
    [sessionLoaded]="sessionLoaded"
    [stores]="stores"
    [backendUrl]="backendUrl"
    [socketUrl]="socketUrl"
    [subscriberId]="subscriberId"
    [applicationIdentifier]="applicationIdentifier"
    [subscriberHash]="subscriberHash"
    [i18n]="i18n"
    [urlChanged]="urlChanged"
    [notificationClicked]="notificationClicked"
    [unseenCountChanged]="unseenCountChanged"
    [actionClicked]="actionClicked"
    [tabClicked]="tabClicked"
    [colorScheme]="colorScheme"
    [theme]="theme"
    [tabs]="tabs"
    [showUserPreferences]="showUserPreferences"
    [offset]="offset"
    [position]="position"
    [unseenBadgeColor]="unseenBadgeColor"
    [unseenBadgeBackgroundColor]="unseenBadgeBackgroundColor"
  ></notification-center-component>`,
  inputs: [
    // NovuProvider props
    'sessionLoaded',
    'stores',
    'backendUrl',
    'socketUrl',
    'subscriberId',
    'applicationIdentifier',
    'subscriberHash',
    'i18n',
    // PopoverNotificationCenter props
    'urlChanged',
    'notificationClicked',
    'unseenCountChanged',
    'actionClicked',
    'tabClicked',
    'colorScheme',
    'theme',
    'tabs',
    'showUserPreferences',
    'offset',
    'position',
    // NotificationBell props
    'unseenBadgeColor',
    'unseenBadgeBackgroundColor',
  ],
})
export class NotificationCenterComponent {
  @Input() sessionLoaded: NotificationCenterComponentProps['sessionLoaded'];
  @Input() stores: NotificationCenterComponentProps['stores'];
  @Input() backendUrl: NotificationCenterComponentProps['backendUrl'];
  @Input() socketUrl: NotificationCenterComponentProps['socketUrl'];
  @Input() subscriberId: NotificationCenterComponentProps['subscriberId'];
  @Input() applicationIdentifier: NotificationCenterComponentProps['applicationIdentifier'] = '';
  @Input() subscriberHash: NotificationCenterComponentProps['subscriberHash'];
  @Input() i18n: NotificationCenterComponentProps['i18n'];
  @Input() urlChanged: NotificationCenterComponentProps['urlChanged'];
  @Input() notificationClicked?: NotificationCenterComponentProps['notificationClicked'];
  @Input() unseenCountChanged: NotificationCenterComponentProps['unseenCountChanged'];
  @Input() actionClicked: NotificationCenterComponentProps['actionClicked'];
  @Input() tabClicked: NotificationCenterComponentProps['tabClicked'];
  @Input() colorScheme?: NotificationCenterComponentProps['colorScheme'];
  @Input() theme: NotificationCenterComponentProps['theme'];
  @Input() tabs: NotificationCenterComponentProps['tabs'];
  @Input() showUserPreferences: NotificationCenterComponentProps['showUserPreferences'];
  @Input() offset: NotificationCenterComponentProps['offset'];
  @Input() position: NotificationCenterComponentProps['position'];
  @Input() unseenBadgeColor: NotificationCenterComponentProps['unseenBadgeColor'];
  @Input() unseenBadgeBackgroundColor: NotificationCenterComponentProps['unseenBadgeBackgroundColor'];
}
