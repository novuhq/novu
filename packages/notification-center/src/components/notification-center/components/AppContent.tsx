import React from 'react';
import { MantineProvider, MantineThemeOverride } from '@mantine/core';
import { css } from '@emotion/css';

import { Layout } from './layout/Layout';
import { useNovuTheme } from '../../../hooks';
import { useFetchOrganization } from '../../../hooks';

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
    <MantineProvider theme={themeConfig}>
      <div className={wrapperClassName(primaryColor, fontFamily, dir)}>
        <Layout />
      </div>
    </MantineProvider>
  );
}

const wrapperClassName = (primaryColor: string, fontFamily: string, dir: string) => css`
  margin: 0;
  font-family: ${fontFamily === 'inherit' ? fontFamily : `${fontFamily}, Helvetica, sans-serif`};
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
