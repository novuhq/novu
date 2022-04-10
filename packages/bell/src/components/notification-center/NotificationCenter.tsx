import React from 'react';
import { App } from './components/App';
import { IMessage } from '@novu/shared';

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
  return <App />;
}
