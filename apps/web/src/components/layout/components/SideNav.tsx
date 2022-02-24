import React from 'react';
import { Navbar } from '@mantine/core';
import { NavMenu } from '../../../design-system';
import { Activity, Bolt, Settings, Team } from '../../../design-system/icons';

type Props = {};
const menuItems = [
  { icon: <Bolt />, link: '/templates', label: 'Notifications', testId: 'side-nav-templates-link' },
  { icon: <Activity />, link: '/activities', label: 'Activity Feed', testId: 'side-nav-activities-link' },
  { icon: <Settings />, link: '/settings/widget', label: 'Settings', testId: 'side-nav-settings-link' },
  {
    icon: <Team />,
    link: '/settings/organization',
    label: 'Team Members',
    testId: 'side-nav-settings-organization',
  },
];

export function SideNav({}: Props) {
  return (
    <Navbar
      padding={30}
      sx={{ backgroundColor: 'transparent', borderRight: 'none', paddingRight: 0 }}
      width={{ base: 300 }}>
      <Navbar.Section>
        <NavMenu menuItems={menuItems} />
      </Navbar.Section>
    </Navbar>
  );
}
