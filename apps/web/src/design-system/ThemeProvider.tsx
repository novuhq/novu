import { MantineProvider, Global } from '@mantine/core';
import { useDarkMode } from 'storybook-dark-mode';
import { mantineConfig } from './config/theme.config';
import { colors } from './config';

declare module '@mantine/core' {
  export type MantineColor = MantineColor | 'gradient';
}

export function ThemeProvider({ children }: { children: JSX.Element }) {
  const dark = useDarkMode();

  return (
    <MantineProvider
      withGlobalStyles
      // withNormalizeCSS
      theme={{
        // Override any other properties from default theme
        colorScheme: dark ? 'dark' : 'light',
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
  );
}
