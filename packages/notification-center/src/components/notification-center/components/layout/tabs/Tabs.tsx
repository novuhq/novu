import React from 'react';
import { Tabs as MantineTabs } from '@mantine/core';
import useStyles from './Tabs.styles';
import { useNovuTheme } from '../../../../../hooks';

interface ITabsProps {
  children: React.ReactNode;
  onTabChange?(tabIndex: number, tabKey?: string): void;
}

export function Tabs({ children, onTabChange }: ITabsProps) {
  const { theme: novuTheme, common, colorScheme } = useNovuTheme();
  const { classes } = useStyles({ novuTheme, common, colorScheme });

  return (
    <MantineTabs onTabChange={onTabChange} variant="unstyled" classNames={classes}>
      {children}
    </MantineTabs>
  );
}
