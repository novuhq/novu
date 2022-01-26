import { AppShell, Header, MantineProvider, Navbar } from '@mantine/core';

export function ThemeProvider({ children, darkMode = false }: { children: JSX.Element; darkMode?: boolean }) {
  return (
    <MantineProvider
      theme={{
        // Override any other properties from default theme
        colorScheme: darkMode ? 'dark' : 'light',
        fontFamily: 'Lato, sans serif',
        primaryColor: 'yellow',
        spacing: { xs: 15, sm: 20, md: 25, lg: 30, xl: 40 },
      }}>
      {children}
    </MantineProvider>
  );
}
