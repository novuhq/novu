import React from 'react';
import { App } from './App';
import { IMessage } from '@novu/shared';

export interface notificationCenterProps {
  sendUrlChange: (url: string) => void;
  sendNotificationClick: (notification: IMessage) => void;
}

export function NotificationCenter(props: notificationCenterProps) {
  return <App {...props} />;
}
