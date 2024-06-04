import { MantineProvider } from '@mantine/core';
import { FC, PropsWithChildren } from 'react';
import { IconProvider } from './icons/IconProvider';
type INovuiProviderProps = PropsWithChildren;

/** Used to export a v7 Mantine provider */
export const NovuiProvider: FC<INovuiProviderProps> = ({ children }) => {
  return (
    <MantineProvider>
      <IconProvider>{children}</IconProvider>
    </MantineProvider>
  );
};
