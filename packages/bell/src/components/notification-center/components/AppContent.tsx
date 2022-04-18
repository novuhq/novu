import { useAuth } from '../../../hooks';
import { useSocketController } from '../../../store/socket/use-socket-controller';
import React, { useContext, useEffect } from 'react';
import { NovuContext } from '../../../store/novu-provider.context';
import { useQuery } from 'react-query';
import { IOrganizationEntity } from '@novu/shared';
import { getOrganization } from '../../../api/organization';
import { colors } from '../../../shared/config/colors';
import styled, { createGlobalStyle, ThemeProvider } from 'styled-components';
import { SocketContext } from '../../../store/socket/socket.store';
import { Layout } from './layout/Layout';
import { Main } from './Main';
import * as WebFont from 'webfontloader';

export function AppContent() {
  const { isLoggedIn } = useAuth();
  const { socket } = useSocketController();
  const { colorScheme } = useContext(NovuContext);

  const { data: organization } = useQuery<Pick<IOrganizationEntity, '_id' | 'name' | 'branding'>>(
    'organization',
    getOrganization,
    {
      enabled: isLoggedIn,
    }
  );

  const theme = {
    colors: {
      main: organization?.branding?.color || colors.vertical,
      fontColor: colorScheme === 'light' ? colors.B40 : colors.white,
      secondaryFontColor: colorScheme === 'light' ? colors.B80 : colors.B40,
    },
    fontFamily: organization?.branding?.fontFamily || 'Lato',
    layout: {
      direction: (organization?.branding?.direction === 'rtl' ? 'rtl' : 'ltr') as 'ltr' | 'rtl',
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
          fontColor={theme.colors.fontColor}
        >
          <Layout>
            <Main />
          </Layout>
        </Wrap>
      </SocketContext.Provider>
    </ThemeProvider>
  );
}

const GlobalStyle = createGlobalStyle<{ fontFamily: string }>`
  body {
    margin: 0;
    font-family: ${({ fontFamily }) => fontFamily}, Helvetica, sans-serif;
    color: #333737;
  }
`;

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
