import React from 'react';
import { MantineProvider, MantineThemeOverride } from '@mantine/core';
import { css } from '@emotion/css';

import { Layout } from './layout/Layout';
import { Main } from './Main';
import { useNovuTheme } from '../../../hooks';
import { ScreenProvider } from '../../../store/screens-provider.context';
import { useFetchOrganization } from '../../../hooks/use-fetch-organization.hook';

export function AppContent() {
  const { theme, common } = useNovuTheme();
  const { data: organization } = useFetchOrganization();

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
