import { useAuth } from '../../../hooks';
import React from 'react';
import { useQuery } from 'react-query';
import { IOrganizationEntity } from '@novu/shared';
import styled, { createGlobalStyle, ThemeProvider } from 'styled-components';
import { Layout } from './layout/Layout';
import { Main } from './Main';
import { useApi } from '../../../hooks/use-api.hook';
import { useNovuThemeProvider } from '../../../hooks/use-novu-theme-provider.hook';

export function AppContent() {
  const { api } = useApi();
  const { isLoggedIn } = useAuth();
  const { theme } = useNovuThemeProvider();
  const { data: organization } = useQuery<Pick<IOrganizationEntity, '_id' | 'name' | 'branding'>>(
    'organization',
    () => api.getOrganization(),
    {
      enabled: isLoggedIn && api.isAuthenticated,
    }
  );

  const themeConfig = {
    colors: {
      main: theme.mainColor || organization?.branding?.color,
      fontColor: theme.layout?.wrapper.fontColor,
      secondaryFontColor: theme.layout?.wrapper.secondaryFontColor,
    },
    fontFamily: theme.fontFamily || organization?.branding?.fontFamily,
    layout: {
      direction: (organization?.branding?.direction === 'rtl' ? 'rtl' : 'ltr') as 'ltr' | 'rtl',
    },
  };

  return (
    <ThemeProvider theme={themeConfig}>
      <GlobalStyle fontFamily={themeConfig.fontFamily} />
      <Wrap
        layoutDirection={themeConfig.layout.direction}
        brandColor={themeConfig.colors.main}
        fontColor={themeConfig.colors.fontColor}
      >
        <Layout>
          <Main />
        </Layout>
      </Wrap>
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
  width: 420px;
  z-index: 999;

  ::-moz-selection {
    background: ${({ brandColor }) => brandColor};
  }

  *::selection {
    background: ${({ brandColor }) => brandColor};
  }
`;
