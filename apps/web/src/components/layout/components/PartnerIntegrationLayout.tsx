import { useEffect } from 'react';
import { useMantineColorScheme } from '@mantine/core';

export function PartnerIntegrationLayout({ children }: { children: React.ReactNode }) {
  const { toggleColorScheme } = useMantineColorScheme();

  useEffect(() => {
    toggleColorScheme('dark');
  }, []);

  return <div>{children}</div>;
}
