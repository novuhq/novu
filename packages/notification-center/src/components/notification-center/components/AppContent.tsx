import React from 'react';
import { useQuery } from 'react-query';
import { MantineProvider } from '@mantine/core';
import styled from '@emotion/styled';
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

  const primaryColor = organization?.branding?.color ?? theme.loaderColor;
  const themeConfig = {
    primaryColor: 'brand',
    fontFamily: common.fontFamily || organization?.branding?.fontFamily,
    dir: (organization?.branding?.direction === 'rtl' ? 'rtl' : 'ltr') as 'ltr' | 'rtl',
    colors: {
      brand: [primaryColor, '', '', '', '', '', '', '', '', ''],
    },
  };

  return (
    <MantineProvider withNormalizeCSS theme={themeConfig}>
      <ScreenProvider>
        <Wrap>
          <Layout>
            <Main />
          </Layout>
        </Wrap>
      </ScreenProvider>
    </MantineProvider>
  );
}

const Wrap = styled.div`
  margin: 0;
  font-family: ${({ theme }) => theme.fontFamily}, Helvetica, sans-serif;
  color: #333737;
  direction: ${({ theme }) => theme.dir};
  width: 420px;
  z-index: 999;

  ::-moz-selection {
    background: ${({ theme }) => theme.colors.brand[0]};
  }

  *::selection {
    background: ${({ theme }) => theme.colors.brand[0]};
  }
`;
