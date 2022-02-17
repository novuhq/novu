import React from 'react';
import { ColorSchemeProvider } from '@mantine/core';
import { ThemeProvider } from '../src/design-system/ThemeProvider';
import { useDarkMode } from 'storybook-dark-mode';
import { DocsContainer } from './Doc.container';

export const parameters = {
  layout: 'fullscreen',
  viewMode: 'docs',
  docs: {
    container: DocsContainer,
  },
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

function ThemeWrapper(props) {
  return (
    <ColorSchemeProvider colorScheme="light" toggleColorScheme={() => {}}>
      <div style={{ margin: '3em' }}>
        <ThemeProvider darkMode={useDarkMode()}>{props.children}</ThemeProvider>
      </div>
    </ColorSchemeProvider>
  );
}

export const decorators = [(renderStory) => <ThemeWrapper>{renderStory()}</ThemeWrapper>];
