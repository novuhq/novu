import React from 'react';
import { lightTheme, darkTheme } from './NovuTheme';
import { Parameters, Decorator } from '@storybook/react';
import { css } from '../styled-system/css';
import { MantineThemeProvider } from '@mantine/core';
import { NovuiProvider } from '../src/components';

import '@mantine/core/styles.css';
// Bring in the Panda-generated stylesheets
import '../src/index.css';

export const parameters: Parameters = {
  layout: 'fullscreen',
  docs: {
    // TODO: fix the container context
    // container: DocsContainer,
  },
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
  darkMode: {
    // Override the default dark theme
    dark: darkTheme,
    // Override the default light theme
    light: lightTheme,
    darkClass: 'dark',
    stylePreview: true,
  },
};

// const channel = addons.getChannel();
function ColorSchemeThemeWrapper({ children }) {
  // wraps the component preview in a full-page container with proper bg color
  return <section className={css({ padding: '250', bg: 'surface.page', height: '[100dvh]' })}>{children}</section>;
}

export const decorators: Decorator[] = [
  (renderStory) => (
    <ColorSchemeThemeWrapper>
      <NovuiProvider>
        <MantineThemeProvider>{renderStory()}</MantineThemeProvider>
      </NovuiProvider>
    </ColorSchemeThemeWrapper>
  ),
];
