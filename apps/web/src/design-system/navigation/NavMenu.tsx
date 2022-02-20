import React, { ReactNode } from 'react';
import { Tabs, Tab } from '@mantine/core';
import useStyles from './NavMenu.styles';

interface INavMenuProps {
  menuItems: { icon: ReactNode; label: string }[];
}

export function NavMenu({ menuItems, ...props }: INavMenuProps) {
  const { classes } = useStyles();

  return (
    <Tabs variant="unstyled" orientation="vertical" classNames={classes} {...props}>
      {menuItems.map((item, index) => (
        <Tab key={index} {...item} />
      ))}
    </Tabs>
  );
}
