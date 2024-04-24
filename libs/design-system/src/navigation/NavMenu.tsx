import React, { ReactNode, useState } from 'react';
import { NavLink as ReactNavLink } from 'react-router-dom';
import { Group, Transition, Popover } from '@mantine/core';
import useStyles from './NavMenu.styles';
import usePopoverStyles from './NavLinkPopover.styles';

interface INavMenuProps {
  menuItems: IMenuItem[];
}

interface IMenuItem {
  icon: ReactNode;
  label: string;
  link: string;
  testId?: string;
  rightSide?: ReactNode | { component: ReactNode; displayOnHover: boolean };
  condition?: boolean;
  tooltipLabel?: string;
}

/**
 * @deprecated
 */
export function NavMenu({ menuItems }: INavMenuProps) {
  return (
    <div>
      {menuItems
        .filter(({ condition = true }) => condition)
        .map(({ icon, link, label, testId, rightSide, tooltipLabel }) => {
          return (
            <NavLink
              link={link}
              icon={icon}
              label={label}
              tooltipLabel={tooltipLabel}
              rightSide={rightSide}
              key={link}
              testId={testId}
            />
          );
        })}
    </div>
  );
}

const NavLink = ({ rightSide, link, testId, icon, label, tooltipLabel }: IMenuItem) => {
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const { classes } = useStyles();

  const onHoverEnabled = (rightSide as { component: ReactNode; displayOnHover: boolean })?.displayOnHover || false;

  return (
    <ReactNavLink
      to={link}
      className={({ isActive }) => (isActive ? classes.linkActive : classes.link)}
      data-test-id={testId}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Group spacing={10}>
        <div className={classes.linkIcon}>{icon}</div>
        <div className={classes.linkLabel}>{label}</div>
      </Group>
      {!onHoverEnabled && rightSide}

      {onHoverEnabled && (
        <RightSide
          child={rightSide}
          isHover={isHovered}
          tooltipLabel={tooltipLabel}
          popoverOpened={popoverOpened}
          setPopoverOpened={setPopoverOpened}
        />
      )}
    </ReactNavLink>
  );
};

const RightSide = ({
  child,
  isHover,
  tooltipLabel,
  popoverOpened,
  setPopoverOpened,
}: {
  child?: ReactNode | { component: ReactNode; displayOnHover: boolean };
  isHover: boolean;
  tooltipLabel: string;
  popoverOpened: boolean;
  setPopoverOpened: (value: boolean) => void;
}) => {
  const { classes } = usePopoverStyles();

  const component = (child as { component: ReactNode; displayOnHover: boolean })?.component || null;

  return (
    <Transition mounted={isHover} transition="fade" duration={400} timingFunction="ease">
      {(styles) => (
        <div onMouseEnter={() => setPopoverOpened(true)} onMouseLeave={() => setPopoverOpened(false)}>
          <Popover
            opened={popoverOpened}
            onClose={() => setPopoverOpened(false)}
            classNames={classes}
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
