import React from 'react';
import { lightTheme, darkTheme } from './NovuTheme';
import { Parameters, Decorator, Preview } from '@storybook/react';
import { css } from '../styled-system/css';
import { MantineThemeProvider } from '@mantine/core';
import { NovuiProvider } from '../src/components';

// Bring in the Panda-generated stylesheets + CSS Layers
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

const DEFAULT_COLOR_PALETTE = 'mode.cloud';

function ColorSchemeThemeWrapper({ children }) {
  // wraps the component preview in a full-page container with proper bg color
  return (
    <section
      className={css({
        padding: '250',
        bg: 'surface.page',
        colorPalette: DEFAULT_COLOR_PALETTE,
        minHeight: '[100vh]',
        height: 'full',
      })}
    >
      {children}
    </section>
  );
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

/** Global controls  */
export const preview: Preview = {
  // The default value of the theme arg for all stories
  argTypes: {
    colorPalette: {
      options: ['mode.cloud', 'mode.local'],
      control: { type: 'select' },
    },
  },
  args: {
    colorPalette: DEFAULT_COLOR_PALETTE,
  },
};

export default preview;
