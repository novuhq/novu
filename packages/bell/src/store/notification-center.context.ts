import React from 'react';
import { IMessage } from '@novu/shared';
import { INotificationCenterContext } from '../index';

export const NotificationCenterContext = React.createContext<INotificationCenterContext>({
  sendUrlChange: (url: string) => {},
  sendNotificationClick: (notification: IMessage) => {},
  onUnseenCountChanged: (unseenCount: number) => {},
  isLoading: true,
  header: null,

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
