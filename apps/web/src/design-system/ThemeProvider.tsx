import { useEffect, useState } from 'react';
import { MantineProvider, Global, ColorSchemeProvider, ColorScheme } from '@mantine/core';
import { NotificationsProvider } from '@mantine/notifications';
import { mantineConfig } from './config/theme.config';
import { colors } from './config';
import { useColorScheme, useLocalStorage } from '@mantine/hooks';

declare module '@mantine/core' {
  export type MantineColor = MantineColor | 'gradient';
}

export function ThemeProvider({ children }: { children: JSX.Element; dark?: Boolean }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(useColorScheme());
  const preferredColorScheme = useColorScheme();

  const [themeStatus, setThemeStatus] = useLocalStorage<String>({
    key: 'mantine-theme',
    defaultValue: 'system',
    getInitialValueInEffect: true,
  });

  const toggleColorScheme = () => {
    if (themeStatus === 'system') setThemeStatus('light');
    else if (themeStatus === 'light') setThemeStatus('dark');
    else setThemeStatus('system');
  };

  useEffect(() => {
    if (themeStatus === 'system') {
      setColorScheme(preferredColorScheme);
    } else if (themeStatus === 'light') setColorScheme('light');
    else setColorScheme('dark');
  }, [themeStatus]);

  return (
    <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
      <MantineProvider
        withGlobalStyles
        withNormalizeCSS
        theme={{
          // Override any other properties from default theme
          colorScheme,
          ...mantineConfig,
        }}
      >
        <Global
          styles={(theme) => ({
            body: {
              ...theme.fn.fontStyles(),
              backgroundColor: theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight,
              color: theme.colorScheme === 'dark' ? colors.white : colors.B40,
            },
            a: {
              textDecoration: 'none',
              color: 'inherit',
            },
          })}
        />
        <NotificationsProvider>{children}</NotificationsProvider>
      </MantineProvider>
    </ColorSchemeProvider>
  );
}
