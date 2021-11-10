import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import styled, { createGlobalStyle, ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';
import { IApplication, ISubscriberJwt } from '@notifire/shared';
import * as WebFont from 'webfontloader';

import { AuthContext } from './store/auth.context';

import { Main } from './Main';
import { Layout } from './components/layout/Layout';

import { applyToken, getToken, useAuthController } from './store/use-auth-controller';
import { useSocketController } from './store/socket/use-socket-controller';
import { SocketContext } from './store/socket/socket.store';
import { WidgetShell } from './ApplicationShell';
import { getApplication } from './api/application';
import { useAuth } from './hooks/use-auth.hook';

const queryClient = new QueryClient();

const tokenStoredToken: string = getToken();
applyToken(tokenStoredToken);

function App() {
  return (
    <RootProviders>
      <AppContent />
    </RootProviders>
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
    background: transparent;
  }
`;

function AppContent() {
  const { isLoggedIn } = useAuth();
  const { socket } = useSocketController();
  const { data: application } = useQuery<Pick<IApplication, '_id' | 'name' | 'branding'>>(
    'application',
    getApplication,
    {
      enabled: isLoggedIn,
    }
  );

  const theme = {
    colors: {
      main: application?.branding?.color || '#cd5450',
      fontColor: application?.branding?.fontColor || '#333737',
      contentBackground: application?.branding?.contentBackground || '#efefef',
    },
    fontFamily: application?.branding?.fontFamily || 'Roboto',
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
        <WidgetShell>
          <Wrap
            layoutDirection={theme.layout.direction}
            brandColor={theme.colors.main}
            fontColor={theme.colors.fontColor}>
            <Router>
              <Switch>
                <Route path="/:applicationId">
                  <Layout>
                    <Main />
                  </Layout>
                </Route>
              </Switch>
            </Router>
          </Wrap>
        </WidgetShell>
      </SocketContext.Provider>
    </ThemeProvider>
  );
}

const Wrap = styled.div<{ layoutDirection: 'ltr' | 'rtl'; brandColor: string; fontColor: string }>`
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid #e9e9e9;
  box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 7px 0px;
  direction: ${({ layoutDirection }) => layoutDirection};
  color: ${({ fontColor }) => fontColor};

  ::-moz-selection {
    background: ${({ brandColor }) => brandColor};
  }

  *::selection {
    background: ${({ brandColor }) => brandColor};
  }
`;

export default App;
