import React from 'react';
import { App } from './components/App';
import { IMessage } from '@novu/shared';

export interface INotificationCenterProps {
  sendUrlChange: (url: string) => void;
  sendNotificationClick: (notification: IMessage) => void;
  onUnseenCountChanged: (unseenCount: number) => void;
  isLoading: boolean;
}

export function NotificationCenter(props: INotificationCenterProps) {
  return <App {...props} />;
}
