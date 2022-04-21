import React, { useContext, useState } from 'react';
import { Navbar } from '@mantine/core';
import { useQuery } from 'react-query';
import { IEnvironment } from '@novu/shared';
import { colors, NavMenu, SegmentedControl, NotificationBadge } from '../../../design-system';
import { Activity, Bolt, Box, Settings, Team, Repeat } from '../../../design-system/icons';
import { EnvContext } from '../../../store/environmentContext';
import { getMyEnvironments, getCurrentEnvironment } from '../../../api/environment';
import { api } from '../../../api/api.client';
import { AuthContext } from '../../../store/authContext';

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

  const changesNavButton = {
    icon: <Repeat />,
    link: '/changes',
    label: 'Changes',
    testId: 'side-nav-changes-link',
    rightSide: <NotificationBadge data-test-id="side-nav-changes-count">{changesCount}</NotificationBadge>,
  };

  return (
    <Navbar p={30} sx={{ backgroundColor: 'transparent', borderRight: 'none', paddingRight: 0 }} width={{ base: 300 }}>
      <Navbar.Section>
        <SegmentedControl
          loading={isLoadingMyEnvironments || isLoadingCurrentEnvironment || isLoading}
          data={['Development', 'Production']}
          defaultValue={currentEnvironment?.name}
          value={currentEnvironment?.name}
          onChange={async (value) => {
            await setEnvironment(value);
          }}
          data-test-id="environment-switch"
        />
        <NavMenu menuItems={[...menuItems, changesNavButton]} />
      </Navbar.Section>
    </Navbar>
  );
}
