import React from 'react';
import { App } from './components/App';
import { IMessage } from '@novu/shared';
import { NotificationCenterContext } from '../../store/notification-center.context';

export function NotificationCenter({
  sendUrlChange,
  sendNotificationClick,
  onUnseenCountChanged,
  isLoading,
}: {
  sendUrlChange: (url: string) => void;
  sendNotificationClick: (notification: IMessage) => void;
  onUnseenCountChanged: (unseenCount: number) => void;
  isLoading: boolean;
}) {
  return (
    <>
      <NotificationCenterContext.Provider
        value={{
          sendUrlChange: sendUrlChange,
          sendNotificationClick: sendNotificationClick,
          onUnseenCountChanged: onUnseenCountChanged,
          isLoading: isLoading,
        }}>
        <App />
      </NotificationCenterContext.Provider>
    </>
  );
}
