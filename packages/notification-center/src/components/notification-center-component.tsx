import React, { FunctionComponent } from 'react';
import { IMessage, MessageActionStatusEnum, ButtonTypeEnum } from '@novu/shared';

import { INovuProviderProps, NovuProvider } from './novu-provider';
import { IPopoverNotificationCenterProps, PopoverNotificationCenter } from './popover-notification-center';
import { NotificationBell } from './notification-bell';
import { useNotifications } from '../hooks';
import { reactToWebComponent } from '../utils';
import { ColorScheme } from '../shared/config/colors';

type SelectedProviderProps = Pick<
  INovuProviderProps,
  | 'onLoad'
  | 'stores'
  | 'backendUrl'
  | 'socketUrl'
  | 'subscriberId'
  | 'applicationIdentifier'
  | 'subscriberHash'
  | 'i18n'
>;
type NovuProviderProps = SelectedProviderProps & {
  // Angular/Vue props
  sessionLoaded?: INovuProviderProps['onLoad'];
};

// Angular/Vue props
interface PopoverAdditionalProps {
  urlChanged?: IPopoverNotificationCenterProps['onUrlChange'];
  notificationClicked?: IPopoverNotificationCenterProps['onNotificationClick'];
  unseenCountChanged?: IPopoverNotificationCenterProps['onUnseenCountChanged'];
  actionClicked?: IPopoverNotificationCenterProps['onActionClick'];
  tabClicked?: IPopoverNotificationCenterProps['onTabClick'];
}

type SelectedPopoverProps = Pick<
  IPopoverNotificationCenterProps,
  | 'onUrlChange'
  | 'onUnseenCountChanged'
  | 'onActionClick'
  | 'onTabClick'
  | 'theme'
  | 'tabs'
  | 'showUserPreferences'
  | 'offset'
  | 'position'
>;
type PopoverProps = SelectedPopoverProps & {
  onNotificationClick?: IPopoverNotificationCenterProps['onNotificationClick'];
  colorScheme?: ColorScheme;
} & PopoverAdditionalProps;

type BellProps = { unseenBadgeColor?: string; unseenBadgeBackgroundColor?: string };

export type NotificationCenterComponentProps = NovuProviderProps & PopoverProps & BellProps;

type PopoverWrapperProps = PopoverProps & BellProps;

/*
 * This array represents the public API of the web component.
 * All the props defined in the NotificationCenterComponentProps should be added here.
 */
export const NOTIFICATION_CENTER_PROPS = [
  // NovuProvider props
  'onLoad',
  'sessionLoaded',
  'stores',
  'backendUrl',
  'socketUrl',
  'subscriberId',
  'applicationIdentifier',
  'subscriberHash',
  'i18n',
  // PopoverNotificationCenter props
  'onUrlChange',
  'onNotificationClick',
  'onUnseenCountChanged',
  'onActionClick',
  'onTabClick',
  'colorScheme',
  'theme',
  'tabs',
  'showUserPreferences',
  'offset',
  'position',
  // NotificationBell props
  'unseenBadgeColor',
  'unseenBadgeBackgroundColor',
];

export const NotificationCenterComponent: FunctionComponent<NotificationCenterComponentProps> = ({
  // NovuProvider props
  sessionLoaded,
  onLoad = sessionLoaded,
  stores,
  backendUrl,
  socketUrl,
  subscriberId,
  applicationIdentifier,
  subscriberHash,
  i18n,
  // PopoverNotificationCenter props
  urlChanged,
  onUrlChange = urlChanged,
  notificationClicked,
  onNotificationClick = notificationClicked,
  unseenCountChanged,
  onUnseenCountChanged = unseenCountChanged,
  actionClicked,
  onActionClick = actionClicked,
  tabClicked,
  onTabClick = tabClicked,
  colorScheme = 'dark',
  theme,
  tabs,
  showUserPreferences,
  offset,
  position,
  // NotificationBell props
  unseenBadgeColor,
  unseenBadgeBackgroundColor,
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
      i18n={i18n}
    >
      <PopoverWrapper
        onUrlChange={onUrlChange}
        onNotificationClick={onNotificationClick}
        onUnseenCountChanged={onUnseenCountChanged}
        onActionClick={onActionClick}
        onTabClick={onTabClick}
        colorScheme={colorScheme}
        theme={theme}
        tabs={tabs}
        showUserPreferences={showUserPreferences}
        offset={offset}
        position={position}
        unseenBadgeColor={unseenBadgeColor}
        unseenBadgeBackgroundColor={unseenBadgeBackgroundColor}
      />
    </NovuProvider>
  );
};

function PopoverWrapper({
  onUrlChange,
  onNotificationClick,
  onUnseenCountChanged,
  onActionClick,
  onTabClick,
  colorScheme = 'dark',
  theme,
  tabs,
  showUserPreferences,
  offset,
  position,
  unseenBadgeColor,
  unseenBadgeBackgroundColor,
}: PopoverWrapperProps) {
  const { updateAction, markAsSeen } = useNotifications();

  function handlerOnNotificationClick(message: IMessage) {
    if (message?.cta?.data?.url) {
      markAsSeen();
    }
    onNotificationClick?.(message);
  }

  async function handlerOnActionClick(templateIdentifier: string, type: ButtonTypeEnum, message: IMessage) {
    await updateAction(message._id, type, MessageActionStatusEnum.DONE);
    onActionClick?.(templateIdentifier, type, message);
  }

  return (
    <PopoverNotificationCenter
      onUrlChange={onUrlChange}
      onNotificationClick={handlerOnNotificationClick}
      onUnseenCountChanged={onUnseenCountChanged}
      onActionClick={handlerOnActionClick}
      onTabClick={onTabClick}
      colorScheme={colorScheme}
      theme={theme}
      tabs={tabs}
      showUserPreferences={showUserPreferences}
      offset={offset}
      position={position}
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
