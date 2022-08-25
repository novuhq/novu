import React from 'react';
import { useQuery } from 'react-query';
import styled, { createGlobalStyle, ThemeProvider } from 'styled-components';
import { IOrganizationEntity } from '@novu/shared';
import { Layout } from './layout/Layout';
import { Main } from './Main';
import { useAuth, useApi, useNovuThemeProvider } from '../../../hooks';
import { ScreenProvider } from '../../../store';

export function AppContent() {
  const { api } = useApi();
  const { isLoggedIn } = useAuth();
  const { theme, common } = useNovuThemeProvider();
  const { data: organization } = useQuery<Pick<IOrganizationEntity, '_id' | 'name' | 'branding'>>(
    'organization',
    () => api.getOrganization(),
    {
      enabled: isLoggedIn && api.isAuthenticated,
    }
  );

  const themeConfig = {
    colors: {
      main: theme.loaderColor || organization?.branding?.color,
      secondaryFontColor: theme.layout?.wrapper.secondaryFontColor,
    },
    fontFamily: common.fontFamily || organization?.branding?.fontFamily,
    layout: {
      direction: (organization?.branding?.direction === 'rtl' ? 'rtl' : 'ltr') as 'ltr' | 'rtl',
    },
  };

  return (
    <ThemeProvider theme={themeConfig}>
      <ScreenProvider>
        <GlobalStyle fontFamily={themeConfig.fontFamily} />
        <Wrap layoutDirection={themeConfig.layout.direction} brandColor={themeConfig.colors.main}>
          <Layout>
            <Main />
          </Layout>
        </Wrap>
      </ScreenProvider>
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

const Wrap = styled.div<{ layoutDirection: 'ltr' | 'rtl'; brandColor: string }>`
  direction: ${({ layoutDirection }) => layoutDirection};
  width: 420px;
  z-index: 999;

  ::-moz-selection {
    background: ${({ brandColor }) => brandColor};
  }

  *::selection {
    background: ${({ brandColor }) => brandColor};
  }
`;
