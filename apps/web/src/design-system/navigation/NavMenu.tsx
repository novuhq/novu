import React, { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Group } from '@mantine/core';
import useStyles from './NavMenu.styles';

interface INavMenuProps {
  menuItems: { icon: ReactNode; label: string; link: string; test?: string }[];
}

export function NavMenu({ menuItems }: INavMenuProps) {
  const { classes } = useStyles();

  return (
    <div>
      {menuItems.map(({ icon, link, label, test }) => (
        <NavLink key={link} to={link} className={classes.link} activeClassName={classes.linkActive} data-test-id={test}>
          <Group spacing={10}>
            <div className={classes.linkIcon}>{icon}</div>
            <div className={classes.linkLabel}>{label}</div>
          </Group>
        </NavLink>
      ))}
    </div>
  );
}
