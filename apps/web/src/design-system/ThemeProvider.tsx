import { useEffect, useState } from 'react';
import { MantineProvider, Global, ColorSchemeProvider, ColorScheme, createStyles } from '@mantine/core';
import { NotificationsProvider } from '@mantine/notifications';
import { useColorScheme } from '@mantine/hooks';

import { mantineConfig } from './config/theme.config';
import { colors, shadows } from './config';
import { useLocalThemePreference } from '../hooks/use-localThemePreference';

const useNotificationStyles = createStyles((theme) => ({
  root: {
    backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
    border: 'none',
    boxShadow: theme.colorScheme === 'dark' ? shadows.dark : shadows.light,
    height: '65px',
    width: '460px',
    borderRadius: '7px',
    padding: '20px',
    justify: 'space-between',
  },
  description: {
    fontSize: '16px',
    fontWeight: 400,
    color: theme.colorScheme === 'dark' ? colors.white : colors.B40,
  },
  closeButton: {
    color: theme.colorScheme === 'dark' ? colors.B40 : colors.B80,
  },
  icon: {
    width: '22px',
    height: '22px',
    marginRight: '10px',
  },
}));

declare module '@mantine/core' {
  export type MantineColor = MantineColor | 'gradient';
}

export function ThemeProvider({ children }: { children: JSX.Element; dark?: Boolean }) {
  const preferredColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState<ColorScheme>(preferredColorScheme);
  const { themeStatus, setThemeStatus } = useLocalThemePreference();
  const { classes: notificationClasses } = useNotificationStyles();

  const toggleColorScheme = () => {
    if (themeStatus === 'system') {
      setThemeStatus('light');
    } else if (themeStatus === 'light') {
      setThemeStatus('dark');
    } else {
      setThemeStatus('system');
    }
  };

  useEffect(() => {
    if (themeStatus === 'system') {
      setColorScheme(preferredColorScheme);
    } else if (themeStatus === 'light') {
      setColorScheme('light');
    } else {
      setColorScheme('dark');
    }
  }, [themeStatus, preferredColorScheme]);

  return (
    <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
      <MantineProvider
        withGlobalStyles
        withNormalizeCSS
        theme={{
          // Override any other properties from default theme
          colorScheme,
          ...mantineConfig,
          components: {
            Notification: {
              classNames: notificationClasses,
            },
          },
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
