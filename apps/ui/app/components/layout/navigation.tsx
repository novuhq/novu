import { NavLink } from '@mantine/core';

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  {
    label: 'Get Started',
    href: '/get-started',
  },
  {
    label: 'Integrations',
    href: '/integrations',
  },
  {
    label: 'Workflows',
    href: '/workflows',
  },
  {
    label: 'Activity Feed',
    href: '/activity-feed',
  },
  {
    label: 'Subscribers',
    href: '/subscribers',
  },
  {
    label: 'API Keys',
    href: '/api-keys',
  },
];

export const Navigation = () => {
  return (
    <>
      {navItems.map((item) => (
        <NavLink key={item.href} label={item.label} href={item.href} />
      ))}
    </>
  );
};
