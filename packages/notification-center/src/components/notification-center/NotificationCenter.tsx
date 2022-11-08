import React from 'react';
import { IMessage, IMessageAction, ButtonTypeEnum } from '@novu/shared';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AppContent } from './components';
import { useNovuContext } from '../../hooks';
import { NotificationCenterContext } from '../../store/notification-center.context';
import { ITab, ListItem } from '../../shared/interfaces';
import { ColorScheme } from '../../shared/config/colors';
import { INovuThemeProvider, NovuThemeProvider } from '../../store/novu-theme-provider.context';

export interface INotificationCenterProps {
  onUrlChange?: (url: string) => void;
  onNotificationClick?: (notification: IMessage) => void;
  onUnseenCountChanged?: (unseenCount: number) => void;
  header?: () => JSX.Element;
  footer?: () => JSX.Element;
  emptyState?: () => JSX.Element;
  listItem?: ListItem;
  actionsResultBlock?: (templateIdentifier: string, messageAction: IMessageAction) => JSX.Element;
  colorScheme: ColorScheme;
  theme?: INovuThemeProvider;
  onActionClick?: (templateIdentifier: string, type: ButtonTypeEnum, message: IMessage) => void;
  tabs?: ITab[];
  showUserPreferences?: boolean;
  onTabClick?: (tab: ITab) => void;
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
          emptyState: props.emptyState,
          listItem: props.listItem,
          actionsResultBlock: props.actionsResultBlock,
          tabs: props.tabs,
          showUserPreferences: props.showUserPreferences ?? true,
          onTabClick: props.onTabClick ? props.onTabClick : () => {},
        }}
      >
        <NovuThemeProvider colorScheme={props.colorScheme} theme={props.theme}>
          <AppContent />
        </NovuThemeProvider>
      </NotificationCenterContext.Provider>
    </QueryClientProvider>
  );
}
