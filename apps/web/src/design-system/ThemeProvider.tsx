import { useState } from 'react';
import { MantineProvider, Global, ColorSchemeProvider, ColorScheme } from '@mantine/core';
import { mantineConfig } from './config/theme.config';
import { colors } from './config';

declare module '@mantine/core' {
  export type MantineColor = MantineColor | 'gradient';
}

export function ThemeProvider({ children, dark = true }: { children: JSX.Element; dark?: Boolean }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('dark');
  const toggleColorScheme = (value?: ColorScheme) =>
    setColorScheme(value || (colorScheme === 'dark' ? 'light' : 'dark'));

  return (
    <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
      <MantineProvider
        withGlobalStyles
        withNormalizeCSS
        theme={{
          // Override any other properties from default theme
          colorScheme,
          ...mantineConfig,
        }}>
        <Global
          styles={(theme) => ({
            body: {
              ...theme.fn.fontStyles(),
              backgroundColor: theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight,
              color: theme.colorScheme === 'dark' ? colors.white : colors.B40,
            },
          })}
        />
        {children}
      </MantineProvider>
    </ColorSchemeProvider>
  );
}
