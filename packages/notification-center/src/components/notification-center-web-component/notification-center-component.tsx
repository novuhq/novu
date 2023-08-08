import React, { FunctionComponent } from 'react';
import { IMessage, MessageActionStatusEnum, ButtonTypeEnum } from '@novu/shared';

import { NovuProvider } from '../novu-provider';
import { PopoverNotificationCenter } from '../popover-notification-center';
import { NotificationBell } from '../notification-bell';
import { reactToWebComponent } from '../../utils';
import type { NotificationCenterComponentProps, PopoverWrapperProps } from './notification-center-component.types';
import { useUpdateAction } from '../../hooks';

/*
 * This array represents the public API of the web component.
 * All the props defined in the NotificationCenterComponentProps should be added here.
 */
export const NOTIFICATION_CENTER_PROPS = [
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

export const NotificationCenterComponent: FunctionComponent<NotificationCenterComponentProps> = ({
  backendUrl,
  socketUrl,
  subscriberId,
  applicationIdentifier,
  subscriberHash,
  stores,
  tabs,
  showUserPreferences,
  allowedNotificationActions,
  popover,
  popoverConfig,
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
      <PopoverWrapper
        onNotificationClick={onNotificationClick}
        onUnseenCountChanged={onUnseenCountChanged}
        onActionClick={onActionClick}
        onTabClick={onTabClick}
        colorScheme={colorScheme}
        theme={theme}
        tabs={tabs}
        showUserPreferences={showUserPreferences}
        allowedNotificationActions={allowedNotificationActions}
        popover={popover}
        popoverConfig={popoverConfig}
        preferenceFilter={preferenceFilter}
      />
    </NovuProvider>
  );
};

function PopoverWrapper({
  onNotificationClick,
  onUnseenCountChanged,
  onActionClick,
  onTabClick,
  colorScheme = 'dark',
  theme,
  tabs,
  showUserPreferences,
  allowedNotificationActions,
  popover,
  popoverConfig,
  unseenBadgeColor,
  unseenBadgeBackgroundColor,
  preferenceFilter,
}: PopoverWrapperProps) {
  const { updateAction } = useUpdateAction();

  function handlerOnActionClick(templateIdentifier: string, type: ButtonTypeEnum, message: IMessage) {
    updateAction({ messageId: message._id, actionButtonType: type, status: MessageActionStatusEnum.DONE });
    onActionClick?.(templateIdentifier, type, message);
  }

  return (
    <PopoverNotificationCenter
      onNotificationClick={onNotificationClick}
      onUnseenCountChanged={onUnseenCountChanged}
      onActionClick={handlerOnActionClick}
      onTabClick={onTabClick}
      preferenceFilter={preferenceFilter}
      colorScheme={colorScheme}
      theme={theme}
      tabs={tabs}
      showUserPreferences={showUserPreferences}
      allowedNotificationActions={allowedNotificationActions}
      offset={popoverConfig?.offset || popover?.offset}
      position={popoverConfig?.position || popover?.position}
    >
      {({ unseenCount }) => (
        <NotificationBell
          colorScheme={colorScheme}
          unseenCount={unseenCount}
          unseenBadgeColor={unseenBadgeColor}
          unseenBadgeBackgroundColor={unseenBadgeBackgroundColor}
        />
      )}
    </PopoverNotificationCenter>
  );
}

export const NotificationCenterWebComponent = reactToWebComponent(NotificationCenterComponent, {
  props: NOTIFICATION_CENTER_PROPS,
});
