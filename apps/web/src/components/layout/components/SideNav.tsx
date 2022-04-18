import { useState, useContext } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Badge, Navbar } from '@mantine/core';
import { IEnvironment } from '@novu/shared';
import { getMyEnvironments, getCurrentEnvironment } from '../../../api/environment';
import { api } from '../../../api/api.client';
import { colors, NavMenu, SegmentedControl } from '../../../design-system';
import { Activity, Bolt, Box, Repeat, Settings, Team } from '../../../design-system/icons';
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
  {
    icon: <Repeat />,
    link: '/changes',
    label: 'Changes',
    testId: 'side-nav-changes-link',
    rightSide: (
      <Badge
        data-test-id="side-nav-changes-count"
        sx={{
          padding: 0,
          width: 20,
          height: 20,
          pointerEvents: 'none',
          border: 'none',
          background: colors.horizontal,
          lineHeight: '14px',
          color: colors.white,
          fontWeight: 'bold',
          fontSize: '12px',
        }}
        radius={100}
      >
        4
      </Badge>
    ),
  },
];

export function SideNav({}: Props) {
  const queryClient = useQueryClient();
  const { setToken, jwtPayload } = useContext(AuthContext);
  const { data: environments, isLoading: isLoadingMyEnvironments } = useQuery<IEnvironment[]>(
    'myEnvironments',
    getMyEnvironments
  );
  const { data: environment, isLoading: isLoadingCurrentEnvironment } = useQuery<IEnvironment>(
    'currentEnvironment',
    getCurrentEnvironment
  );
  const [isLoading, setIsLoading] = useState(false);

  async function changeEnvironment(environmentName: string) {
    if (isLoading || isLoadingMyEnvironments || isLoadingCurrentEnvironment) {
      return;
    }

    const targetEnvironment = environments?.find((_environment) => _environment.name === environmentName);
    if (!targetEnvironment) {
      return;
    }

    setIsLoading(true);

    const tokenResponse = await api.post(`/v1/auth/environments/${targetEnvironment?._id}/switch`, {});
    setToken(tokenResponse.token);
    setIsLoading(false);

    await queryClient.refetchQueries();
  }

  return (
    <Navbar p={30} sx={{ backgroundColor: 'transparent', borderRight: 'none', paddingRight: 0 }} width={{ base: 300 }}>
      <Navbar.Section>
        <SegmentedControl
          data={['Development', 'Production']}
          defaultValue={environment?.name}
          value={environment?.name}
          onChange={async (value) => {
            await changeEnvironment(value);
          }}
        />
        <NavMenu menuItems={menuItems} />
      </Navbar.Section>
    </Navbar>
  );
}
