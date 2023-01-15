import { Box, useMantineColorScheme } from '@mantine/core';

export function PartnerIntegrationLayout({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useMantineColorScheme();

  const isDark = colorScheme === 'dark';
  const logoUrl = `/static/images/logo-formerly-${isDark ? 'dark' : 'light'}-bg.png`;

  return (
    <div>
      <Box>
        <img src={logoUrl} alt="logo" style={{ maxWidth: 150, marginTop: 10, marginLeft: 10 }} />
      </Box>
      {children}
    </div>
  );
}
