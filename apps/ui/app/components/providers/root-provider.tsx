import { MantineProvider } from '@mantine/core';

export const RootProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <MantineProvider>{children}</MantineProvider>;
};
