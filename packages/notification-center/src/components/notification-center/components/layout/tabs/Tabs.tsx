import React from 'react';
import { Tabs as MantineTabs } from '@mantine/core';
import useStyles from './Tabs.styles';
import { useNovuTheme } from '../../../../../hooks';

export function Tabs({ children }: { children: React.ReactNode }) {
  const { theme: novuTheme, common, colorScheme } = useNovuTheme();
  const { classes } = useStyles({ novuTheme, common, colorScheme });

  return (
    <MantineTabs variant="unstyled" classNames={classes}>
      {children}
    </MantineTabs>
  );
}
