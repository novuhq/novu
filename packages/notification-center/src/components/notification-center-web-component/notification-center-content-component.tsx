import React, { FunctionComponent } from 'react';

import { NovuProvider } from '../novu-provider';
import { reactToWebComponent } from '../../utils';
import type { NotificationCenterComponentProps, PopoverWrapperProps } from './notification-center-component.types';
import { NotificationCenter } from '../notification-center';

/*
 * This array represents the public API of the web component.
 * All the props defined in the NotificationCenterComponentProps should be added here.
 */
export const NOTIFICATION_CENTER_CONTENT_PROPS = [
  'backendUrl',
  'socketUrl',
  'subscriberId',
  'applicationIdentifier',
  'subscriberHash',
  'stores',
  'tabs',
  'showUserPreferences',
  'allowedNotificationActions',
  'theme',
  'styles',
  'colorScheme',
  'i18n',
  'onLoad',
  'sessionLoaded',
  'onNotificationClick',
  'notificationClicked',
  'onUnseenCountChanged',
  'unseenCountChanged',
  'onActionClick',
  'actionClicked',
  'onTabClick',
  'tabClicked',
  'preferenceFilter',
];

export type NotificationCenterContentComponentProps = Omit<NotificationCenterComponentProps, 'popover'>;

export const NotificationCenterContentComponent: FunctionComponent<NotificationCenterContentComponentProps> = ({
  backendUrl,
  socketUrl,
  subscriberId,
  applicationIdentifier,
  subscriberHash,
  stores,
  tabs,
  showUserPreferences,
  allowedNotificationActions,
  theme,
  styles,
  colorScheme = 'dark',
  i18n,
  sessionLoaded,
  onLoad = sessionLoaded,
  notificationClicked,
  onNotificationClick = notificationClicked,
  unseenCountChanged,
  onUnseenCountChanged = unseenCountChanged,
  actionClicked,
  onActionClick = actionClicked,
  tabClicked,
  onTabClick = tabClicked,
  preferenceFilter,
}) => {
  return (
    <NovuProvider
      onLoad={onLoad}
      stores={stores}
      backendUrl={backendUrl}
      socketUrl={socketUrl}
      subscriberId={subscriberId}
      applicationIdentifier={applicationIdentifier}
      subscriberHash={subscriberHash}
      styles={styles}
      i18n={i18n}
    >
      <NotificationCenter
        onNotificationClick={onNotificationClick}
        onUnseenCountChanged={onUnseenCountChanged}
        colorScheme={colorScheme}
        theme={theme}
        onActionClick={onActionClick}
        tabs={tabs}
        showUserPreferences={showUserPreferences}
        allowedNotificationActions={allowedNotificationActions}
        onTabClick={onTabClick}
        preferenceFilter={preferenceFilter}
      />
    </NovuProvider>
  );
};

export const NotificationCenterContentWebComponent = reactToWebComponent(NotificationCenterContentComponent, {
  props: NOTIFICATION_CENTER_CONTENT_PROPS,
});
