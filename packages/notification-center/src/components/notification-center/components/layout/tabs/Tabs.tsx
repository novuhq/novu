import { Tabs as MantineTabs } from '@mantine/core';
import useStyles from './Tabs.styles';
import { useNovuThemeProvider } from '../../../../../hooks/use-novu-theme-provider.hook';
import React from 'react';

export function Tabs({ children }: { children: React.ReactNode }) {
  const { theme: novuTheme, common } = useNovuThemeProvider();
  const { classes } = useStyles({ novuTheme, common });

  return (
    <MantineTabs variant="unstyled" classNames={classes}>
      {children}
    </MantineTabs>
  );
}
