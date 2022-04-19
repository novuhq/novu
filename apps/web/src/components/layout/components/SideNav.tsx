import React, { useContext } from 'react';
import { Navbar } from '@mantine/core';
import { colors, NavMenu, SegmentedControl } from '../../../design-system';
import { Activity, Bolt, Box, Settings, Team } from '../../../design-system/icons';
import { EnvContext } from '../../../store/environmentContext';

type Props = {};
const menuItems = [
  { icon: <Bolt />, link: '/templates', label: 'Notifications', testId: 'side-nav-templates-link' },
  { icon: <Activity />, link: '/activities', label: 'Activity Feed', testId: 'side-nav-activities-link' },
  { icon: <Box />, link: '/integrations', label: 'Integration Store', testId: 'side-nav-integrations-link' },
  { icon: <Settings />, link: '/settings', label: 'Settings', testId: 'side-nav-settings-link' },
  {
    icon: <Team />,
    link: '/team',
    label: 'Team Members',
    testId: 'side-nav-settings-organization',
  },
];

export function SideNav({}: Props) {
  const { currentEnvironment, setEnvironment } = useContext(EnvContext);

  return (
    <Navbar p={30} sx={{ backgroundColor: 'transparent', borderRight: 'none', paddingRight: 0 }} width={{ base: 300 }}>
      <Navbar.Section>
        <SegmentedControl
          data={['Development', 'Production']}
          defaultValue={currentEnvironment?.name}
          value={currentEnvironment?.name}
          onChange={async (value) => {
            await setEnvironment(value);
          }}
        />
        <NavMenu menuItems={menuItems} />
      </Navbar.Section>
    </Navbar>
  );
}
