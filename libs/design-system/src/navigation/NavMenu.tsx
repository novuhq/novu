import React, { ReactNode, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Group, Transition, Popover } from '@mantine/core';
import useStyles from './NavMenu.styles';
import usePopoverStyles from './NavLinkPopover.styles';

interface INavMenuProps {
  menuItems: {
    icon: ReactNode;
    label: string;
    link: string;
    testId?: string;
    rightSide?: ReactNode | { component: ReactNode; displayOnHover: boolean };
    condition?: boolean;
    tooltipLabel?: string;
  }[];
}

export function NavMenu({ menuItems }: INavMenuProps) {
  const { classes } = useStyles();
  const { classes: popoverClasses } = usePopoverStyles();
  const [popoverOpened, setPopoverOpened] = useState(false);

  const [isHovered, setIsHovered] = useState<string>(null);

  return (
    <div>
      {menuItems
        .filter(({ condition = true }) => condition)
        .map(({ icon, link, label, testId, rightSide, tooltipLabel }) => {
          const withOnHover = (rightSide as { component: ReactNode; displayOnHover: boolean })?.displayOnHover || false;

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
              {!withOnHover && rightSide}

              {withOnHover &&
                rightSideWithHover({
                  rightSide: rightSide,
                  isHover: isHovered === link,
                  tooltipLabel: tooltipLabel,
                  popoverClasses: popoverClasses,
                  popoverOpened: popoverOpened,
                  setPopoverOpened: setPopoverOpened,
                })}
            </NavLink>
          );
        })}
    </div>
  );
}

const rightSideWithHover = ({
  rightSide,
  isHover,
  tooltipLabel,
  popoverClasses,
  popoverOpened,
  setPopoverOpened,
}: {
  rightSide?: ReactNode | { component: ReactNode; displayOnHover: boolean };
  isHover: boolean;
  tooltipLabel: string;
  popoverClasses: { dropdown: string; arrow: string };
  popoverOpened: boolean;
  setPopoverOpened: (value: boolean) => void;
}) => {
  const component = (rightSide as { component: ReactNode; displayOnHover: boolean })?.component || null;

  return (
    <Transition mounted={isHover} transition="fade" duration={400} timingFunction="ease">
      {(styles) => (
        <div onMouseEnter={() => setPopoverOpened(true)} onMouseLeave={() => setPopoverOpened(false)}>
          <Popover
            opened={popoverOpened}
            onClose={() => setPopoverOpened(false)}
            classNames={popoverClasses}
            withArrow
            withinPortal={true}
            transitionDuration={250}
            position="top"
            radius="md"
          >
            <Popover.Target>
              <div style={styles}>{component}</div>
            </Popover.Target>
            <Popover.Dropdown>
              <div style={{ maxWidth: '190px' }}>{tooltipLabel}</div>
            </Popover.Dropdown>
          </Popover>
        </div>
      )}
    </Transition>
  );
};
