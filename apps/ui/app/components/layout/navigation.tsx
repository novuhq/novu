import { NavLink, Stack } from '@mantine/core';
import {
  IconTaskAlt,
  IconOutlineSchema,
  IconCellTower,
  IconPeopleOutline,
  IconQueryStats,
  IconVpnKey,
} from '@novu/novui/icons';
import { NavLink as RemixNavLink } from '@remix-run/react';

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactElement;
};

const navItems: NavItem[] = [
  {
    label: 'Get Started',
    href: '/get-started',
    icon: <IconTaskAlt />,
  },
  {
    label: 'Integrations',
    href: '/integrations',
    icon: <IconCellTower />,
  },
  {
    label: 'Workflows',
    href: '/workflows',
    icon: <IconOutlineSchema />,
  },
  {
    label: 'Activity Feed',
    href: '/activity-feed',
    icon: <IconQueryStats />,
  },
  {
    label: 'Subscribers',
    href: '/subscribers',
    icon: <IconPeopleOutline />,
  },
  {
    label: 'API Keys',
    href: '/api-keys',
    icon: <IconVpnKey />,
  },
];

export const Navigation = () => {
  return (
    <Stack gap="xs">
      {navItems.map((item) => (
        <NavLink component={RemixNavLink} leftSection={item.icon} key={item.href} label={item.label} to={item.href} />
      ))}
    </Stack>
  );
};
