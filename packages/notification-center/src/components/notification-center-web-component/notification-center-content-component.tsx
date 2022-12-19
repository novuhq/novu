import React, { FunctionComponent } from 'react';

import { NovuProvider } from '../novu-provider';
import { useUnseenCount } from '../../hooks';
import { reactToWebComponent } from '../../utils';
import type { NotificationCenterComponentProps, PopoverWrapperProps } from './notification-center-component.types';
import { NotificationCenter } from '../notification-center/NotificationCenter';

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
];

export type NotificationCenterContentComponentProps = Omit<NotificationCenterComponentProps, 'popover'>;
type NotificationCenterWrapperProps = Omit<
  PopoverWrapperProps,
  'popover' | 'unseenBadgeColor' | 'unseenBadgeBackgroundColor'
>;

export const NotificationCenterContentComponent: FunctionComponent<NotificationCenterContentComponentProps> = ({
  backendUrl,
  socketUrl,
  subscriberId,
  applicationIdentifier,
  subscriberHash,
  stores,
  tabs,
  showUserPreferences,
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
      <NotificationCenterWrapper
        onNotificationClick={onNotificationClick}
        onUnseenCountChanged={onUnseenCountChanged}
        colorScheme={colorScheme}
        theme={theme}
        onActionClick={onActionClick}
        tabs={tabs}
        showUserPreferences={showUserPreferences}
        onTabClick={onTabClick}
      />
    </NovuProvider>
  );
};

function NotificationCenterWrapper({
  onNotificationClick,
  onUnseenCountChanged,
  onActionClick,
  onTabClick,
  colorScheme = 'dark',
  theme,
  tabs,
  showUserPreferences,
}: NotificationCenterWrapperProps) {
  const { setUnseenCount } = useUnseenCount();

  function handlerOnUnseenCount(count: number) {
    if (isNaN(count)) return;

    setUnseenCount(count);

    if (onUnseenCountChanged) {
      onUnseenCountChanged(count);
    }
  }

  return (
    <NotificationCenter
      onNotificationClick={onNotificationClick}
      onUnseenCountChanged={handlerOnUnseenCount}
      colorScheme={colorScheme}
      theme={theme}
      onActionClick={onActionClick}
      tabs={tabs}
      showUserPreferences={showUserPreferences}
      onTabClick={onTabClick}
    />
  );
}

export const NotificationCenterContentWebComponent = reactToWebComponent(NotificationCenterContentComponent, {
  props: NOTIFICATION_CENTER_CONTENT_PROPS,
});
