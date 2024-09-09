import { MantineProvider } from '@mantine/core';
import { themeConfig } from '@/config/mantine';

export const RootProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MantineProvider forceColorScheme="dark" theme={themeConfig}>
      {children}
    </MantineProvider>
  );
};
