import React, { useEffect } from 'react';
import { addons } from '@storybook/preview-api';
import { DARK_MODE_EVENT_NAME } from 'storybook-dark-mode';
import { ThemeProvider } from '../src/ThemeProvider';
import { DocsContainer } from './Doc.container';
import { useLocalThemePreference } from '@novu/shared-web';

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
  darkMode: {
    current: 'dark',
    classTarget: 'html',
  },
};

const channel = addons.getChannel();
function ColorSchemeThemeWrapper({ children }) {
  const { setThemeStatus } = useLocalThemePreference();

  const handleColorScheme = (value) => {
    setThemeStatus(value ? 'dark' : 'light');
  };

  useEffect(() => {
    channel.on(DARK_MODE_EVENT_NAME, handleColorScheme);
    return () => channel.off(DARK_MODE_EVENT_NAME, handleColorScheme);
  }, [channel]);

  return (
    <div style={{ margin: '3em' }}>
      <ThemeProvider>{children}</ThemeProvider>
    </div>
  );
}

export const decorators = [(renderStory) => <ColorSchemeThemeWrapper>{renderStory()}</ColorSchemeThemeWrapper>];
