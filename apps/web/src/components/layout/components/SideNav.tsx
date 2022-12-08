import { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Navbar,
  Popover,
  CloseButton,
  useMantineColorScheme,
  createStyles,
  createPolymorphicComponent,
  CloseButtonProps,
} from '@mantine/core';
import styled from '@emotion/styled';

import { colors, NavMenu, SegmentedControl, shadows } from '../../../design-system';
import { Activity, Bolt, Box, Settings, Team, Repeat, CheckCircleOutlined } from '../../../design-system/icons';
import { ChangesCountBadge } from '../../changes/ChangesCountBadge';
import { useEnvController } from '../../../store/use-env-controller';
import { AuthContext } from '../../../store/authContext';
import OrganizationSelect from './OrganizationSelect';
import { SpotlightContext } from '../../../store/spotlightContext';

const usePopoverStyles = createStyles(({ colorScheme }) => ({
  dropdown: {
    padding: '12px 20px 14px 15px',
    backgroundColor: colorScheme === 'dark' ? colors.B20 : colors.white,
    position: 'absolute',
    color: colorScheme === 'dark' ? colors.white : colors.B40,
    border: 'none',
    marginTop: '1px',
  },
  arrow: {
    backgroundColor: colorScheme === 'dark' ? colors.B20 : colors.white,
    height: '7px',
    border: 'none',
    margin: '0px',
  },
}));

type Props = {};

export function SideNav({}: Props) {
  const navigate = useNavigate();
  const { setEnvironment, isLoading, environment, readonly } = useEnvController();
  const { currentUser } = useContext(AuthContext);
  const location = useLocation();
  const [opened, setOpened] = useState(readonly);
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';
  const { addItem } = useContext(SpotlightContext);
  const { classes } = usePopoverStyles();

  useEffect(() => {
    setOpened(readonly);
    if (readonly && location.pathname === '/changes') {
      navigate('/');
    }
  }, [readonly]);

  useEffect(() => {
    addItem([
      {
        id: 'toggle-environment',
        title: `Toggle to ${environment?.name === 'Production' ? 'Development' : 'Production'} environment`,
        onTrigger: () => {
          setEnvironment(environment?.name === 'Production' ? 'Development' : 'Production');
        },
      },
    ]);
  }, [environment]);

  const menuItems = [
    {
      condition: !readonly && currentUser?.showOnBoarding,
      icon: <CheckCircleOutlined />,
      link: '/quickstart',
      label: 'Getting Started',
      testId: 'side-nav-quickstart-link',
    },
    { icon: <Bolt />, link: '/templates', label: 'Notifications', testId: 'side-nav-templates-link' },
    {
      icon: <Team />,
      link: '/subscribers',
      label: 'Subscribers',
      testId: 'side-nav-subscribers-link',
    },
    { icon: <Activity />, link: '/activities', label: 'Activity Feed', testId: 'side-nav-activities-link' },
    { icon: <Box />, link: '/integrations', label: 'Integrations Store', testId: 'side-nav-integrations-link' },
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
      rightSide: <ChangesCountBadge />,
      condition: !readonly,
    },
  ];

  async function handlePopoverForChanges(e) {
    e.preventDefault();

    await setEnvironment('Development');
    navigate('/changes');
  }

  return (
    <Navbar
      p={30}
      sx={{
        position: 'static',
        backgroundColor: 'transparent',
        borderRight: 'none',
        paddingRight: 0,
        width: '300px',
        '@media (max-width: 768px)': {
          width: '100%',
        },
      }}
    >
      <Navbar.Section grow>
        <Popover
          classNames={classes}
          withArrow
          opened={opened}
          onClose={() => setOpened(false)}
          withinPortal={false}
          transition="rotate-left"
          transitionDuration={250}
          position="right"
          radius="md"
          shadow={dark ? shadows.dark : shadows.medium}
        >
          <Popover.Target>
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
          </Popover.Target>
          <Popover.Dropdown>
            <div style={{ maxWidth: '220px', paddingRight: '10px' }}>
              <CloseButtonStyled onClick={() => setOpened(false)} aria-label="Close popover" />
              {'To make changes you’ll need to visit '}
              <StyledLink onClick={handlePopoverForChanges}>development changes</StyledLink>{' '}
              {' and promote the changes from there'}
            </div>
          </Popover.Dropdown>
        </Popover>
        <NavMenu menuItems={menuItems} />
      </Navbar.Section>
      <Navbar.Section mt={15}>
        <Navbar.Section>
          <OrganizationSelect />
        </Navbar.Section>
        <BottomNav dark={dark} data-test-id="side-nav-bottom-links">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://discord.novu.co"
            data-test-id="side-nav-bottom-link-support"
          >
            Support
          </a>
          <p>
            <b>&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;</b>
          </p>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://docs.novu.co"
            data-test-id="side-nav-bottom-link-documentation"
          >
            Documentation
          </a>
        </BottomNav>
      </Navbar.Section>
    </Navbar>
  );
}

const CloseButtonStyled = createPolymorphicComponent<'button', CloseButtonProps>(styled(CloseButton)`
  position: absolute;
  top: 7px;
  z-index: 2;
  right: 10px;
`);

const StyledLink = styled.a`
  font-weight: bold;
  text-decoration: underline;

  &:hover {
    cursor: pointer;
  }
`;

const BottomNavWrapper = styled.div`
  margin-top: auto;
  padding-top: 30px;
`;

const BottomNav = styled.div<{ dark: boolean }>`
  color: ${colors.B60};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 5px;
`;
