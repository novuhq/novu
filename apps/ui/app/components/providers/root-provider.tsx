import { MantineProvider } from '@mantine/core';
import { theme } from '@/config/mantine';

export const RootProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MantineProvider forceColorScheme="dark" theme={theme}>
      {children}
    </MantineProvider>
  );
};
