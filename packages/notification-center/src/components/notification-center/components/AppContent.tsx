import React from 'react';
import { useQuery } from 'react-query';
import { MantineProvider, MantineThemeOverride } from '@mantine/core';
import { css } from '@emotion/css';
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
  const fontFamily = common.fontFamily || organization?.branding?.fontFamily;
  const dir = (organization?.branding?.direction === 'rtl' ? 'rtl' : 'ltr') as 'ltr' | 'rtl';
  const themeConfig: MantineThemeOverride = {
    fontFamily,
    dir,
  };

  return (
    <MantineProvider withNormalizeCSS theme={themeConfig}>
      <ScreenProvider>
        <div className={wrapperClassName(primaryColor, fontFamily, dir)}>
          <Layout>
            <Main />
          </Layout>
        </div>
      </ScreenProvider>
    </MantineProvider>
  );
}

const wrapperClassName = (primaryColor: string, fontFamily: string, dir: string) => css`
  margin: 0;
  font-family: ${fontFamily}, Helvetica, sans-serif;
  color: #333737;
  direction: ${dir};
  width: 420px;
  z-index: 999;

  ::-moz-selection {
    background: ${primaryColor};
  }

  *::selection {
    background: ${primaryColor};
  }
`;
