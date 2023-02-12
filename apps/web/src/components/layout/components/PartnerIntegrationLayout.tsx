import { Box, useMantineColorScheme } from '@mantine/core';
import { CONTEXT_PATH } from '../../../config';

export function PartnerIntegrationLayout({ children }: { children: React.ReactNode }) {
  const { colorScheme } = useMantineColorScheme();

  const isDark = colorScheme === 'dark';
  const logoUrl = isDark ? CONTEXT_PATH + '/static/images/logo-light.png' : CONTEXT_PATH + '/static/images/logo.png';

  return (
    <div>
      <Box>
        <img src={logoUrl} alt="logo" style={{ maxWidth: 150, marginTop: 10, marginLeft: 10 }} />
      </Box>
      {children}
    </div>
  );
}
