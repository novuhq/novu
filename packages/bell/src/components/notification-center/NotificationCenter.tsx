import React, { useContext } from 'react';
import { IMessage } from '@novu/shared';

import { NovuContext } from '../../store/novu-provider.context';
import { NotificationCenterContext } from '../../store/notification-center.context';
import { AppContent } from './components';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ColorScheme } from '../../index';
import { ThemeContext } from '../../store/novu-theme.context';

export interface INotificationCenterProps {
  onUrlChange?: (url: string) => void;
  onNotificationClick?: (notification: IMessage) => void;
  onUnseenCountChanged?: (unseenCount: number) => void;
  header?: () => JSX.Element;
  footer?: () => JSX.Element;
  colorScheme: ColorScheme;
}

export function NotificationCenter(props: INotificationCenterProps) {
  const queryClient = new QueryClient();
  const { applicationIdentifier } = useContext(NovuContext);

  return (
    <ThemeContext.Provider value={{ colorScheme: props.colorScheme }}>
      <QueryClientProvider client={queryClient}>
        <NotificationCenterContext.Provider
          value={{
            onUrlChange: props.onUrlChange,
            onNotificationClick: props.onNotificationClick,
            onUnseenCountChanged: props.onUnseenCountChanged,
            isLoading: !applicationIdentifier,
            header: props.header,
            footer: props.footer,
          }}
        >
          <AppContent />
        </NotificationCenterContext.Provider>
      </QueryClientProvider>
    </ThemeContext.Provider>
  );
}
