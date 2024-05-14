import React from 'react';
// import { addons } from '@storybook/preview-api';
// import { DARK_MODE_EVENT_NAME } from 'storybook-dark-mode';
// import { ColorSchemePreferenceEnum, useLocalThemePreference } from '@novu/shared-web';
import { lightTheme, darkTheme } from './NovuTheme';
import { Parameters, Decorator } from '@storybook/react';

// Bring in the Panda-generated stylesheets
import '../src/index.css';

// import '../styled-system/styles.css';

export const parameters: Parameters = {
  layout: 'fullscreen',
  viewMode: 'docs',
  docs: {
    // @TODO: fix the container context
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
  },
};

// const channel = addons.getChannel();
function ColorSchemeThemeWrapper({ children }) {
  // const { setThemeStatus } = useLocalThemePreference();

  // const handleColorScheme = (value) => {
  //   setThemeStatus(value ? ColorSchemePreferenceEnum.DARK : ColorSchemePreferenceEnum.LIGHT);
  // };

  // useEffect(() => {
  //   channel.on(DARK_MODE_EVENT_NAME, handleColorScheme);
  //   return () => channel.off(DARK_MODE_EVENT_NAME, handleColorScheme);
  // }, [channel]);

  return <div style={{ margin: '3em' }}>{children}</div>;
}

export const decorators: Decorator[] = [
  (renderStory) => <ColorSchemeThemeWrapper>{renderStory()}</ColorSchemeThemeWrapper>,
];
