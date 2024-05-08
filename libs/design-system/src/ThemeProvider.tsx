import { ReactNode } from 'react';
import { MantineProvider, Global, ColorSchemeProvider, MantineTheme } from '@mantine/core';
import { NotificationsProvider } from '@mantine/notifications';

import { mantineConfig } from './config/theme.config';
import { colors, shadows } from './config';
import { ChevronDown } from './icons';
import { IconProvider } from './iconsV2/IconProvider';
import { useColorScheme } from './color-scheme';

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

export function ThemeProvider({
  children,
  shouldDisableGlobals,
}: {
  children: ReactNode | ReactNode[];
  shouldDisableGlobals?: Boolean;
}) {
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
      <MantineProvider
        withGlobalStyles={!shouldDisableGlobals}
        withNormalizeCSS={!shouldDisableGlobals}
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
        {!shouldDisableGlobals && (
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
        )}
        <NotificationsProvider>
          <IconProvider>{children}</IconProvider>
        </NotificationsProvider>
      </MantineProvider>
    </ColorSchemeProvider>
  );
}
