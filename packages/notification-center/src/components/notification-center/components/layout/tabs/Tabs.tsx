import React from 'react';
import { Tabs as MantineTabs, TabsValue } from '@mantine/core';
import { useNovuTheme } from '../../../../../hooks';
import useStyles from './Tabs.styles';

interface ITabsProps {
  children: React.ReactNode;
  onTabChange?: (value: TabsValue) => void;
  value: string;
}

export function Tabs({ children, onTabChange, value }: ITabsProps) {
  const { theme: novuTheme, common, colorScheme } = useNovuTheme();
  const { classes } = useStyles({ novuTheme, common, colorScheme });

  return (
    <MantineTabs
      onTabChange={onTabChange}
      defaultValue={value}
      keepMounted={false}
      variant="default"
      classNames={classes}
    >
      {children}
    </MantineTabs>
  );
}
