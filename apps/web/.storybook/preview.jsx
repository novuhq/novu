import React from 'react';
import { useDarkMode } from 'storybook-dark-mode';
import { ThemeProvider } from '@novu/design-system';
import { DocsContainer } from './Doc.container';

export const parameters = {
  layout: 'fullscreen',
  viewMode: 'docs',
  docs: {
    container: DocsContainer,
  },
  darkMode: {
    current: 'dark',
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
    <div style={{ margin: '3em' }}>
      <ThemeProvider dark={useDarkMode()}>{props.children}</ThemeProvider>
    </div>
  );
}

export const decorators = [(renderStory) => <ThemeWrapper>{renderStory()}</ThemeWrapper>];
