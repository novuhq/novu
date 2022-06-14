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

  const organizationTheme = {
    colors: {
      main: organization?.branding?.color || theme.mainColor,
      fontColor: theme.layoutWrap.colors.fontColor,
      secondaryFontColor: theme.layoutWrap.colors.secondaryFontColor,
    },
    fontFamily: organization?.branding?.fontFamily || theme.fontFamily,
    layout: {
      direction: (organization?.branding?.direction === 'rtl' ? 'rtl' : 'ltr') as 'ltr' | 'rtl',
    },
  };

  return (
    <ThemeProvider theme={organizationTheme}>
      <GlobalStyle fontFamily={organizationTheme.fontFamily} />
      <Wrap
        layoutDirection={organizationTheme.layout.direction}
        brandColor={organizationTheme.colors.main}
        fontColor={organizationTheme.colors.fontColor}
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
