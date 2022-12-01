import React from 'react';
import { useQuery } from 'react-query';
import styled, { ThemeProvider } from 'styled-components';
import { IOrganizationEntity } from '@novu/shared';
import { Layout } from './layout/Layout';
import { Main } from './Main';
import { useAuth, useApi, useNovuTheme } from '../../../hooks';
import { ScreenProvider } from '../../../store/screens-provider.context';

export function AppContent() {
  const { api } = useApi();
  const { isLoggedIn } = useAuth();
  const { theme, common } = useNovuTheme();
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
        <Wrap
          fontFamily={themeConfig.fontFamily}
          layoutDirection={themeConfig.layout.direction}
          brandColor={themeConfig.colors.main}
        >
          <Layout>
            <Main />
          </Layout>
        </Wrap>
      </ScreenProvider>
    </ThemeProvider>
  );
}

const Wrap = styled.div<{ fontFamily: string; layoutDirection: 'ltr' | 'rtl'; brandColor: string }>`
  margin: 0;
  font-family: ${({ fontFamily }) => fontFamily}, Helvetica, sans-serif;
  color: #333737;
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
