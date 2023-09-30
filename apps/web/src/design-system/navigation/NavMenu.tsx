import React, { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Group } from '@mantine/core';
import useStyles from './NavMenu.styles';

interface INavMenuProps {
  menuItems: {
    icon: ReactNode;
    label: string;
    link: string;
    testId?: string;
    rightSide?: ReactNode;
    condition?: boolean;
  }[];
}

export function NavMenu({ menuItems }: INavMenuProps) {
  const { classes } = useStyles();

  return (
    <div>
      {menuItems
        .filter(({ condition = true }) => condition)
        .map(({ icon, link, label, testId, rightSide }) => (
          <NavLink
            key={link}
            to={link}
            className={({ isActive }) => (isActive ? classes.linkActive : classes.link)}
            data-test-id={testId}
          >
            <Group spacing={10}>
              <div className={classes.linkIcon}>{icon}</div>
              <div className={classes.linkLabel}>{label}</div>
            </Group>
            <div>{rightSide}</div>
          </NavLink>
        ))}
    </div>
  );
}
