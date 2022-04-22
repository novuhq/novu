import { Navbar } from '@mantine/core';
import { NavMenu, SegmentedControl } from '../../../design-system';
import { Activity, Bolt, Box, Settings, Team, Repeat } from '../../../design-system/icons';
import { ChangesCountBadge } from '../../changes/ChangesCountBadge';
import { useEnvController } from '../../../store/use-env-controller';

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
  const { setEnvironment, isLoading, environment } = useEnvController();

  const changesNavButton = {
    icon: <Repeat />,
    link: '/changes',
    label: 'Changes',
    testId: 'side-nav-changes-link',
    rightSide: <ChangesCountBadge />,
  };

  return (
    <Navbar p={30} sx={{ backgroundColor: 'transparent', borderRight: 'none', paddingRight: 0 }} width={{ base: 300 }}>
      <Navbar.Section>
        <SegmentedControl
          loading={isLoading}
          data={['Development', 'Production']}
          defaultValue={environment?.name}
          value={environment?.name}
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
