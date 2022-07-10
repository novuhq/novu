import React from 'react';
import { IMessage } from '@novu/shared';
import { NotificationCenterContext } from '../../store/notification-center.context';
import { AppContent } from './components';
import { QueryClient, QueryClientProvider } from 'react-query';
import { useNovuContext } from '../../hooks';
import { INovuThemeProvider, NovuThemeProvider } from '../../store/novu-theme-provider.context';
import { ColorScheme } from '../../index';

export interface INotificationCenterProps {
  onUrlChange?: (url: string) => void;
  onNotificationClick?: (notification: IMessage) => void;
  onUnseenCountChanged?: (unseenCount: number) => void;
  header?: () => JSX.Element;
  footer?: () => JSX.Element;
  colorScheme: ColorScheme;
  theme?: INovuThemeProvider;
  tabs?: { name: string; query?: { feedId: string | string[] } }[];
}

export function NotificationCenter(props: INotificationCenterProps) {
  const queryClient = new QueryClient();
  const { applicationIdentifier } = useNovuContext();

  return (
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
        <NovuThemeProvider colorScheme={props.colorScheme} theme={props.theme}>
          <AppContent tabs={props.tabs} />
        </NovuThemeProvider>
      </NotificationCenterContext.Provider>
    </QueryClientProvider>
  );
}
