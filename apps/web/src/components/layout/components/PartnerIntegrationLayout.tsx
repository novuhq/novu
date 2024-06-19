import { useMantineColorScheme } from '@mantine/core';

export function PartnerIntegrationLayout({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useMantineColorScheme();

  const isDark = colorScheme === 'dark';

  return <div>{children}</div>;
}
