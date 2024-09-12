import { Button, Group, NavLink, Progress, Stack, Text } from '@mantine/core';
import {
  IconTaskAlt,
  IconOutlineSchema,
  IconCellTower,
  IconPeopleOutline,
  IconOutlineTimer,
  IconQueryStats,
  IconVpnKey,
  IconRocketLaunch,
} from '@novu/novui/icons';
import { Link, NavLink as RemixNavLink } from '@remix-run/react';

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
    <Stack h="100%" justify={'space-between'}>
      <Stack gap="xs">
        {navItems.map((item) => (
          <NavLink component={RemixNavLink} leftSection={item.icon} key={item.href} label={item.label} to={item.href} />
        ))}
      </Stack>
      <Stack gap="md">
        <Stack gap="sm">
          <Group c="secondary" justify={'flex-start'}>
            <IconOutlineTimer style={{ height: 16, width: 16 }} />
            <Text size="sm">
              Trial expires in <strong>25 days</strong>
            </Text>
          </Group>
          <Button component={Link} to="/manage-settings/billing">
            <Group gap="xs">
              <IconRocketLaunch />
              <Text>Upgrade plan</Text>
            </Group>
          </Button>
        </Stack>
        <Stack gap="xs">
          <Progress value={50} size="xs" />
          <Group justify="space-between">
            <Text size="xs">0</Text>
            <Text size="xs">250,000</Text>
          </Group>
        </Stack>
      </Stack>
    </Stack>
  );
};
