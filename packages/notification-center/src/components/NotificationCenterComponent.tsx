import React from 'react';
import ReactDOM from 'react-dom';

import { IMessage, MessageActionStatusEnum, ButtonTypeEnum, IOrganizationEntity } from '@novu/shared';
import reactToWebComponent from 'react-to-webcomponent';

import { INovuProviderProps, NovuProvider } from './novu-provider';
import { useNotifications } from '../hooks';
import { PopoverNotificationCenter } from './popover-notification-center';
import { INotificationBellProps, NotificationBell } from './notification-bell';

export interface NotificationCenterComponentProps {
  stores?: INovuProviderProps['stores'];
  backendUrl?: INovuProviderProps['backendUrl'];
  socketUrl?: INovuProviderProps['socketUrl'];
  subscriberId?: INovuProviderProps['subscriberId'];
  applicationIdentifier: INovuProviderProps['applicationIdentifier'];
  onLoad?: INovuProviderProps['onLoad'];
  subscriberHash?: INovuProviderProps['subscriberHash'];
  i18n?: INovuProviderProps['i18n'];
  colorScheme?: 'light' | 'dark';
  // TODO: remove this prop
  asd?: any;
}

/*
 * This array represents the public API of the web component.
 * All the props defined in the NotificationCenterComponentProps should be added here.
 */
export const NOTIFICATION_CENTER_PROPS = [
  'stores',
  'backendUrl',
  'socketUrl',
  'subscriberId',
  'applicationIdentifier',
  'onLoad',
  'subscriberHash',
  'i18n',
  'colorScheme',
  // TODO: remove this prop
  'asd',
];

export const NotificationCenterComponent = ({
  backendUrl,
  socketUrl,
  subscriberId,
  applicationIdentifier,
  colorScheme = 'dark',
  asd,
}: NotificationCenterComponentProps) => {
  console.log({ backendUrl, socketUrl, subscriberId, applicationIdentifier, asd });

  return (
    <NovuProvider
      backendUrl={backendUrl}
      socketUrl={socketUrl}
      subscriberId={subscriberId}
      applicationIdentifier={applicationIdentifier}
    >
      <PopoverWrapper colorScheme={colorScheme} />
    </NovuProvider>
  );
};

function PopoverWrapper({ colorScheme }: Pick<NotificationCenterComponentProps, 'colorScheme'>) {
  const { updateAction, markAsSeen } = useNotifications();

  function handlerOnNotificationClick(message: IMessage) {
    if (message?.cta?.data?.url) {
      markAsSeen();
      window.location.href = message.cta.data.url;
    }
  }

  async function handlerOnActionClick(_: string, type: ButtonTypeEnum, message: IMessage) {
    await updateAction(message._id, type, MessageActionStatusEnum.DONE);
  }

  return (
    <PopoverNotificationCenter
      colorScheme={colorScheme}
      onNotificationClick={handlerOnNotificationClick}
      onActionClick={handlerOnActionClick}
    >
      {({ unseenCount }) => {
        return <NotificationBell colorScheme={colorScheme} unseenCount={unseenCount} />;
      }}
    </PopoverNotificationCenter>
  );
}

export const NotificationCenterWebComponent = reactToWebComponent(NotificationCenterComponent, React, ReactDOM, {
  props: NOTIFICATION_CENTER_PROPS,
});

customElements.define('notification-center-component', NotificationCenterWebComponent);
