import React, { useState } from 'react';
import { MantineProvider, ColorSchemeProvider, Affix, ActionIcon } from '@mantine/core';
import { ThemeProvider } from '../src/design-system/ThemeProvider';
import { useDarkMode } from 'storybook-dark-mode';

export const parameters = {
  layout: 'fullscreen',
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
      <ThemeProvider darkMode={useDarkMode()}>{props.children}</ThemeProvider>
    </ColorSchemeProvider>
  );
}

export const decorators = [(renderStory) => <ThemeWrapper>{renderStory()}</ThemeWrapper>];
