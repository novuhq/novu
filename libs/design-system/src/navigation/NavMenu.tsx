import React, { ReactNode, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Group, Transition } from '@mantine/core';
import useStyles from './NavMenu.styles';

interface INavMenuProps {
  menuItems: {
    icon: ReactNode;
    label: string;
    link: string;
    testId?: string;
    rightSide?: ReactNode | { component: ReactNode; displayOnHover: boolean };
    condition?: boolean;
  }[];
}

export function NavMenu({ menuItems }: INavMenuProps) {
  const { classes } = useStyles();
  const [isHovered, setIsHovered] = useState<string>(null);

  return (
    <div>
      {menuItems
        .filter(({ condition = true }) => condition)
        .map(({ icon, link, label, testId, rightSide }) => {
          return (
            <NavLink
              key={link}
              to={link}
              className={({ isActive }) => (isActive ? classes.linkActive : classes.link)}
              data-test-id={testId}
              onMouseEnter={() => setIsHovered(link)}
              onMouseLeave={() => setIsHovered(null)}
            >
              <Group spacing={10}>
                <div className={classes.linkIcon}>{icon}</div>
                <div className={classes.linkLabel}>{label}</div>
              </Group>
              {rightSideSection({ rightSide: rightSide, isHover: isHovered === link })}
            </NavLink>
          );
        })}
    </div>
  );
}

const rightSideSection = ({
  rightSide,
  isHover,
}: {
  rightSide?: ReactNode | { component: ReactNode; displayOnHover: boolean };
  isHover: boolean;
}) => {
  const withOnHover = (rightSide as { component: ReactNode; displayOnHover: boolean })?.displayOnHover || false;

  if (!withOnHover) {
    return rightSide;
  }

  const onHoverWithTransaction = (rightSide as { component: ReactNode; displayOnHover: boolean })?.component || false;

  return (
    <Transition mounted={isHover} transition="fade" duration={400} timingFunction="ease">
      {(styles) => <div style={styles}>{onHoverWithTransaction}</div>}
    </Transition>
  );
};
