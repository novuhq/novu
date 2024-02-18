import { ReactNode, useEffect, useState } from 'react';
import { MantineProvider, Global, ColorSchemeProvider, ColorScheme, MantineTheme } from '@mantine/core';
import { NotificationsProvider } from '@mantine/notifications';
import { useColorScheme } from '@mantine/hooks';
import { useLocalThemePreference } from '@novu/shared-web';

import { mantineConfig } from './config/theme.config';
import { colors, shadows } from './config';
import { ChevronDown } from './icons';
import { IconProvider } from './iconsV2/IconProvider';

const accordionStyles = (theme: MantineTheme) => ({
  item: {
    background: theme.colorScheme === 'dark' ? colors.B15 : colors.B98,
    borderRadius: 8,
    marginBottom: 24,
  },
  control: {
    color: colors.B60,
    fontSize: 14,
    lineHeight: '20px',
    padding: 16,
    paddingRight: 20,
    '&:hover': {
      background: 'transparent',
    },
  },
  content: {
    padding: 16,
  },
});

const notificationStyles = (theme: MantineTheme) => {
  return {
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
  };
};

declare module '@mantine/core' {
  export type MantineColor = MantineColor | 'gradient';
}

export function ThemeProvider({ children }: { children: ReactNode | ReactNode[]; dark?: Boolean }) {
  const preferredColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState<ColorScheme>(preferredColorScheme);
  const { themeStatus, setThemeStatus } = useLocalThemePreference();

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
              styles: notificationStyles,
            },
            Accordion: {
              styles: accordionStyles,
              defaultProps: {
                chevron: <ChevronDown />,
              },
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
              marginRight: `calc(-1 * var(--removed-scroll-width, 0))`,
              overflow: 'hidden',
            },
            a: {
              textDecoration: 'none',
              color: 'inherit',
            },
          })}
        />
        <NotificationsProvider>
          <IconProvider>{children}</IconProvider>
        </NotificationsProvider>
      </MantineProvider>
    </ColorSchemeProvider>
  );
}
