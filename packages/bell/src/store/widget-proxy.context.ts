import React from 'react';
import { IMessage } from '@novu/shared';
import { INotificationCenterProps } from '../index';

export const WidgetProxyContext = React.createContext<INotificationCenterProps>({
  sendUrlChange: (url: string) => {},
  sendNotificationClick: (notification: IMessage) => {},
  onUnseenCountChanged: (unseenCount: number) => {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
