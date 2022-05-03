import { Navbar, Popover, useMantineColorScheme } from '@mantine/core';
import { colors, NavMenu, SegmentedControl, shadows } from '../../../design-system';
import { Activity, Bolt, Box, Settings, Team, Repeat } from '../../../design-system/icons';
import { ChangesCountBadge } from '../../changes/ChangesCountBadge';
import { useEnvController } from '../../../store/use-env-controller';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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

const changesMenuItem = {
  icon: <Repeat />,
  link: '/changes',
  label: 'Changes',
  testId: 'side-nav-changes-link',
  rightSide: <ChangesCountBadge />,
};

export function SideNav({}: Props) {
  const navigate = useNavigate();
  const { setEnvironment, isLoading, environment, readonly } = useEnvController();
  const location = useLocation();
  const [opened, setOpened] = useState(readonly);
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  useEffect(() => {
    setOpened(readonly);
    if (readonly && location.pathname === '/changes') {
      navigate('/');
    }
  }, [readonly]);

  return (
    <Navbar p={30} sx={{ backgroundColor: 'transparent', borderRight: 'none', paddingRight: 0 }} width={{ base: 300 }}>
      <Navbar.Section>
        <Popover
          styles={{
            inner: {
              padding: '12px 20px 14px 15px',
            },
            arrow: {
              backgroundColor: dark ? colors.B20 : colors.white,
              height: '7px',
              border: 'none',
              margin: '0px',
            },
            body: {
              backgroundColor: dark ? colors.B20 : colors.white,
              position: 'relative',
              color: dark ? colors.white : colors.B40,
              border: 'none',
              marginTop: '1px',
            },
          }}
          withArrow
          opened={opened}
          onClose={() => setOpened(false)}
          withCloseButton={true}
          withinPortal={false}
          transition="rotate-left"
          transitionDuration={250}
          placement="center"
          position="right"
          radius="md"
          shadow={dark ? shadows.dark : shadows.medium}
          target={
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
          }
        >
          {'To make changes you’ll need to go to development and promote the changes from there'}
        </Popover>
        <NavMenu menuItems={readonly ? menuItems : [...menuItems, changesMenuItem]} />
      </Navbar.Section>
    </Navbar>
  );
}
