import React from 'react';
import { IMessage } from '@novu/shared';
import { INotificationCenterContext } from '../index';

export const NotificationCenterContext = React.createContext<INotificationCenterContext>({
  onUrlChange: (url: string) => {},
  onNotificationClick: (notification: IMessage) => {},
  onUnseenCountChanged: (unseenCount: number) => {},
  isLoading: true,
  header: null,
  footer: null,
} as any);
