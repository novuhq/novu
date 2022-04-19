import React, { useContext } from 'react';
import { IMessage } from '@novu/shared';

import { NovuContext } from '../../store/novu-provider.context';
import { NotificationCenterContext } from '../../store/notification-center.context';
import { AppContent } from './components';
import { QueryClient, QueryClientProvider } from 'react-query';
import { IHeaderProps } from './components/layout/header/Header';

export interface INotificationCenterProps {
  onUrlChange?: (url: string) => void;
  onNotificationClick?: (notification: IMessage) => void;
  onUnseenCountChanged?: (unseenCount: number) => void;
  header?: (props: IHeaderProps) => JSX.Element;
}

export function NotificationCenter(props: INotificationCenterProps) {
  const queryClient = new QueryClient();
  const { applicationIdentifier } = useContext(NovuContext);

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationCenterContext.Provider
        value={{
          sendUrlChange: props.onUrlChange,
          sendNotificationClick: props.onNotificationClick,
          onUnseenCountChanged: props.onUnseenCountChanged,
          isLoading: !applicationIdentifier,
          header: props.header,
        }}
      >
        <AppContent />
      </NotificationCenterContext.Provider>
    </QueryClientProvider>
  );
}
