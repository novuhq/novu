import { MantineProvider, Global, MantineColor } from '@mantine/core';
import { mantineConfig } from './config/theme.config';

declare module '@mantine/core' {
  export type MantineColor = MantineColor | 'gradient';
}

export function ThemeProvider({ children, darkMode = false }: { children: JSX.Element; darkMode?: boolean }) {
  return (
    <MantineProvider
      withGlobalStyles
      theme={{
        // Override any other properties from default theme
        colorScheme: darkMode ? 'dark' : 'light',
        ...mantineConfig,
      }}>
      <Global
        styles={(theme) => ({
          body: {
            ...theme.fn.fontStyles(),
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.colors.gray[0],
            color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
          },
        })}
      />
      {children}
    </MantineProvider>
  );
}
