import { useEffect } from 'react';
import { useMantineColorScheme } from '@mantine/core';

export function PartnerIntegrationLayout({ children }: { children: React.ReactNode }) {
  const { toggleColorScheme, colorScheme } = useMantineColorScheme();

  useEffect(() => {
    if (colorScheme === 'light') {
      toggleColorScheme('dark');
    }
  }, [colorScheme, toggleColorScheme]);

  return <div>{children}</div>;
}
