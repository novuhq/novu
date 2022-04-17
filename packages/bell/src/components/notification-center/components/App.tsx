import React, { useContext, useEffect } from 'react';
import styled, { createGlobalStyle, ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';
import { IApplication, ISubscriberJwt } from '@novu/shared';
import * as WebFont from 'webfontloader';

import { AuthContext } from '../../../store/auth.context';
import { applyToken, getToken, useAuthController } from '../../../store/use-auth-controller';
import { useSocketController } from '../../../store/socket/use-socket-controller';
import { SocketContext } from '../../../store/socket/socket.store';
import { colors } from '../../../shared/config/colors';
import { NovuContext } from '../../../store/novu-provider.context';
import { useAuth } from '../../../hooks';
import { getApplication } from '../../../api/application';
import { Main, Layout } from '../components';
import { NotificationCenterContext } from '../../../store/notification-center.context';
import { INotificationCenterProps } from '../NotificationCenter';

const queryClient = new QueryClient();
const tokenStoredToken: string = getToken();
applyToken(tokenStoredToken);

export function App(props: INotificationCenterProps) {
  const { applicationIdentifier } = useContext(NovuContext);

  return (
    <NotificationCenterContext.Provider
      value={{
        sendUrlChange: props.onUrlChange,
        sendNotificationClick: props.onNotificationClick,
        onUnseenCountChanged: props.onUnseenCountChanged,
        isLoading: !applicationIdentifier,
      }}>
      <RootProviders>
        <AppContent />
      </RootProviders>
    </NotificationCenterContext.Provider>
  );
}

function RootProviders({ children }: { children: JSX.Element }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

function AuthProvider({ children }: { children: JSX.Element }) {
  const { token, setToken, user, setUser, isLoggedIn } = useAuthController();

  return (
    <AuthContext.Provider value={{ token, setToken, user: user as ISubscriberJwt, setUser, isLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
}

const GlobalStyle = createGlobalStyle<{ fontFamily: string }>`
  body {
    margin: 0;
    font-family: ${({ fontFamily }) => fontFamily}, Helvetica, sans-serif;
    color: #333737;
  }
`;

function AppContent() {
  const { isLoggedIn } = useAuth();
  const { socket } = useSocketController();
  const { colorScheme } = useContext(NovuContext);

  const { data: application } = useQuery<Pick<IApplication, '_id' | 'name' | 'branding'>>(
    'application',
    getApplication,
    {
      enabled: isLoggedIn,
    }
  );

  const theme = {
    colors: {
      main: application?.branding?.color || colors.vertical,
      fontColor: colorScheme === 'light' ? colors.B40 : colors.white,
      secondaryFontColor: colorScheme === 'light' ? colors.B80 : colors.B40,
    },
    fontFamily: application?.branding?.fontFamily || 'Lato',
    layout: {
      direction: (application?.branding?.direction === 'rtl' ? 'rtl' : 'ltr') as 'ltr' | 'rtl',
    },
  };

  useEffect(() => {
    WebFont.load({
      google: {
        families: [theme.fontFamily],
      },
    });
  }, [theme.fontFamily]);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle fontFamily={theme.fontFamily} />
      <SocketContext.Provider value={{ socket }}>
        <Wrap
          layoutDirection={theme.layout.direction}
          brandColor={theme.colors.main}
          fontColor={theme.colors.fontColor}>
          <Layout>
            <Main />
          </Layout>
        </Wrap>
      </SocketContext.Provider>
    </ThemeProvider>
  );
}

const Wrap = styled.div<{ layoutDirection: 'ltr' | 'rtl'; brandColor: string; fontColor: string }>`
  direction: ${({ layoutDirection }) => layoutDirection};
  color: ${({ fontColor }) => fontColor};
  min-width: 420px;
  z-index: 999;

  ::-moz-selection {
    background: ${({ brandColor }) => brandColor};
  }

  *::selection {
    background: ${({ brandColor }) => brandColor};
  }
`;
