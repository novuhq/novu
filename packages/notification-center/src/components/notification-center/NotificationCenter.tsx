import React from 'react';
import { IMessage, IMessageAction, ButtonTypeEnum } from '@novu/shared';
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
  actionsResultBlock?: (templateIdentifier: string, messageAction: IMessageAction) => JSX.Element;
  colorScheme: ColorScheme;
  theme?: INovuThemeProvider;
  onActionClick?: (templateIdentifier: string, type: ButtonTypeEnum, message: IMessage) => void;
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
          onActionClick: props.onActionClick,
          isLoading: !applicationIdentifier,
          header: props.header,
          footer: props.footer,
          actionsResultBlock: props.actionsResultBlock,
        }}
      >
        <NovuThemeProvider colorScheme={props.colorScheme} theme={props.theme}>
          <AppContent tabs={props.tabs} />
        </NovuThemeProvider>
      </NotificationCenterContext.Provider>
    </QueryClientProvider>
  );
}
