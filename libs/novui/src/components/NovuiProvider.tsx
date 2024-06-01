import { MantineProvider } from '@mantine/core';
import { FC, PropsWithChildren } from 'react';
interface INovuiProviderProps extends PropsWithChildren {}

/** Used to export a v7 Mantine provider */
export const NovuiProvider: FC<INovuiProviderProps> = ({ children }) => {
  return <MantineProvider>{children}</MantineProvider>;
};
