import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled, { createGlobalStyle, ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider, useQuery } from 'react-query';
import { IEnvironment, ISubscriberJwt } from '@novu/shared';
import * as WebFont from 'webfontloader';

import { AuthContext } from './store/auth.context';

import { Main } from './Main';
import { Layout } from './components/layout/Layout';

import { applyToken, getToken, useAuthController } from './store/use-auth-controller';
import { useSocketController } from './store/socket/use-socket-controller';
import { SocketContext } from './store/socket/socket.store';
import { WidgetShell } from './ApplicationShell';
import { getEnvironment } from './api/environment';
import { useAuth } from './hooks/use-auth.hook';
import { colors } from './shared/config/colors';

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
  const [userColorScheme, setUserColorScheme] = useState<'light' | 'dark'>('light');
  const { data: environment } = useQuery<Pick<IEnvironment, '_id' | 'name' | 'branding'>>(
    'environment',
    getEnvironment,
    {
      enabled: isLoggedIn,
    }
  );

  const theme = {
    colors: {
      main: environment?.branding?.color || colors.vertical,
      fontColor: userColorScheme === 'light' ? colors.B40 : colors.white,
      secondaryFontColor: userColorScheme === 'light' ? colors.B80 : colors.B40,
    },
    fontFamily: environment?.branding?.fontFamily || 'Lato',
    layout: {
      direction: (environment?.branding?.direction === 'rtl' ? 'rtl' : 'ltr') as 'ltr' | 'rtl',
    },
    colorScheme: userColorScheme,
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
              <Routes>
                <Route
                  path="/:environmentId"
                  element={
                    <Layout>
                      <Main />
                    </Layout>
                  }
                />
              </Routes>
            </Router>
          </Wrap>
        </WidgetShell>
      </SocketContext.Provider>
    </ThemeProvider>
  );
}

const Wrap = styled.div<{ layoutDirection: 'ltr' | 'rtl'; brandColor: string; fontColor: string }>`
  overflow: hidden;
  direction: ${({ layoutDirection }) => layoutDirection};
  color: ${({ fontColor }) => fontColor};
  min-width: 420px;

  ::-moz-selection {
    background: ${({ brandColor }) => brandColor};
  }

  *::selection {
    background: ${({ brandColor }) => brandColor};
  }
`;

export default App;
