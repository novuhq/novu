import React from 'react';
import { IMessage, ButtonTypeEnum } from '@novu/shared';
import { INotificationCenterContext, ITab } from '../shared/interfaces';

export const NotificationCenterContext = React.createContext<INotificationCenterContext>({
  onUrlChange: (url: string) => {},
  onNotificationClick: (notification: IMessage) => {},
  onUnseenCountChanged: (unseenCount: number) => {},
  onActionClick: (identifier: string, type: ButtonTypeEnum, message: IMessage) => {},
  isLoading: true,
  header: null,
  footer: null,
  emptyState: null,
  listItem: null,
  actionsResultBlock: null,
  tabs: [],
  showUserPreferences: true,
  onTabClick: (tab: ITab) => {},
} as any);
