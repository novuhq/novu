import { MantineProvider, Global, MantineColor, ColorScheme } from '@mantine/core';
import { mantineConfig } from './config/theme.config';
import { colors } from './config';

declare module '@mantine/core' {
  export type MantineColor = MantineColor | 'gradient';
}

export function ThemeProvider({ children, colorScheme }: { children: JSX.Element; colorScheme: ColorScheme }) {
  return (
    <MantineProvider
      withGlobalStyles
      theme={{
        // Override any other properties from default theme
        colorScheme,
        ...mantineConfig,
      }}>
      <Global
        styles={(theme) => ({
          body: {
            ...theme.fn.fontStyles(),
            backgroundColor: theme.colorScheme === 'dark' ? colors.BGDark : theme.colors.gray[0],
            color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : colors.B40,
          },
        })}
      />
      {children}
    </MantineProvider>
  );
}
