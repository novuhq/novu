import { Box, useMantineColorScheme } from '@mantine/core';

export function PartnerIntegrationLayout({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useMantineColorScheme();

  const isDark = colorScheme === 'dark';
  const logoUrl = isDark ? '/static/images/logo-light.png' : '/static/images/logo.png';

  return (
    <div>
      <Box>
        <img src={logoUrl} alt="logo" style={{ maxWidth: 150, marginTop: 10, marginLeft: 10 }} />
      </Box>
      {children}
    </div>
  );
}
