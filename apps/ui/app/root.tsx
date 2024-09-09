import '@mantine/core/styles.css';

import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import { ColorSchemeScript } from '@mantine/core';
import { RootProvider } from './components/providers/root-provider';
import { AppShell } from './components/layout/app-shell';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <ColorSchemeScript forceColorScheme="dark" />
      </head>
      <body>
        <RootProvider>
          <AppShell>{children}</AppShell>
        </RootProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
